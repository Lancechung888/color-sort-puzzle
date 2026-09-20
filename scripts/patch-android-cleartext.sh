#!/usr/bin/env bash
# Idempotent deny cleartext HTTP for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
#
# Stock Capacitor may leave cleartext permitted. AdMob / Play Billing / Capacitor
# asset loads should be HTTPS-only; deny cleartext at Manifest + networkSecurityConfig.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
XML_DIR="$ANDROID_DIR/app/src/main/res/xml"
NSC_XML="$XML_DIR/network_security_config.xml"

log() { echo "[patch-android-cleartext] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

mkdir -p "$XML_DIR"

python3 - "$MANIFEST" "$NSC_XML" <<'PY'
import re
import sys

manifest_path, nsc_path = sys.argv[1], sys.argv[2]

NSC_CONTENT = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<!-- ANDROID-CLEARTEXT: deny cleartext; HTTPS-only (AdMob/Billing/Capacitor https scheme). -->
<network-security-config>
    <base-config cleartextTrafficPermitted=\"false\" />
</network-security-config>
"""

def write_if_needed(path: str, content: str, label: str) -> None:
    try:
        cur = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        cur = None
    if cur == content:
        print(f"[patch-android-cleartext] {label} already current — ok.")
        return
    open(path, "w", encoding="utf-8").write(content)
    print(f"[patch-android-cleartext] Wrote {label}.")

write_if_needed(nsc_path, NSC_CONTENT, "network_security_config.xml")

raw = open(manifest_path, encoding="utf-8").read()

app_m = re.search(r"<application\b([\s\S]*?)>", raw, re.I)
if not app_m:
    sys.stderr.write("ERROR: <application> not found in Manifest\n")
    sys.exit(1)

attrs = app_m.group(1)
start, end = app_m.start(1), app_m.end(1)

def has_attr(name: str, value: str | None = None) -> bool:
    if value is None:
        return bool(re.search(rf'android:{name}\s*=', attrs, re.I))
    return bool(
        re.search(rf'android:{name}\s*=\s*["\']{re.escape(value)}["\']', attrs, re.I)
    )

def set_attr(text: str, name: str, value: str) -> str:
    pat = rf'\s*android:{name}\s*=\s*["\'][^"\']*["\']'
    if re.search(pat, text, re.I):
        return re.sub(pat, f'\n        android:{name}="{value}"', text, count=1, flags=re.I)
    return text.rstrip() + f'\n        android:{name}="{value}"\n        '

need = []
if not has_attr("usesCleartextTraffic", "false"):
    need.append("usesCleartextTraffic")
if not has_attr("networkSecurityConfig", "@xml/network_security_config"):
    need.append("networkSecurityConfig")

if not need:
    print(
        "[patch-android-cleartext] Manifest already usesCleartextTraffic=false + "
        "networkSecurityConfig/@xml/network_security_config — ok."
    )
    sys.exit(0)

attrs2 = attrs
attrs2 = set_attr(attrs2, "usesCleartextTraffic", "false")
attrs2 = set_attr(attrs2, "networkSecurityConfig", "@xml/network_security_config")

new_raw = raw[:start] + attrs2 + raw[end:]
# Sanity
app2 = re.search(r"<application\b([\s\S]*?)>", new_raw, re.I)
assert app2 is not None
a2 = app2.group(1)
assert re.search(r'android:usesCleartextTraffic\s*=\s*["\']false["\']', a2, re.I)
assert re.search(
    r'android:networkSecurityConfig\s*=\s*["\']@xml/network_security_config["\']', a2, re.I
)
open(manifest_path, "w", encoding="utf-8").write(new_raw)
print(
    "[patch-android-cleartext] Patched <application>: usesCleartextTraffic=false, "
    "networkSecurityConfig=@xml/network_security_config."
)
PY
