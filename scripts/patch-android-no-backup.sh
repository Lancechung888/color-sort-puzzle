#!/usr/bin/env bash
# Idempotent disable Android Auto Backup / cloud data extraction for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 on success path.
#
# Stock Capacitor sets android:allowBackup="true" with no rules. Auto-restoring WebView
# localStorage after reinstall / device transfer can corrupt progress. In-app Settings
# "Backup progress" Export/Import (SAVE-BACKUP) is the supported backup path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
XML_DIR="$ANDROID_DIR/app/src/main/res/xml"
RULES_XML="$XML_DIR/data_extraction_rules.xml"
BACKUP_XML="$XML_DIR/backup_rules.xml"

log() { echo "[patch-android-no-backup] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

mkdir -p "$XML_DIR"

python3 - "$MANIFEST" "$RULES_XML" "$BACKUP_XML" <<'PY'
import re
import sys

manifest_path, rules_path, backup_path = sys.argv[1], sys.argv[2], sys.argv[3]

RULES_CONTENT = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<!-- ANDROID-NO-BACKUP: deny cloud backup + device-transfer extraction.
     Progress backup is in-app Settings Export/Import (SAVE-BACKUP). -->
<data-extraction-rules>
    <cloud-backup>
        <exclude domain=\"root\" path=\".\" />
    </cloud-backup>
    <device-transfer>
        <exclude domain=\"root\" path=\".\" />
    </device-transfer>
</data-extraction-rules>
"""

BACKUP_CONTENT = """<?xml version=\"1.0\" encoding=\"utf-8\"?>
<!-- ANDROID-NO-BACKUP: empty include list — fullBackupContent deny-all companion. -->
<full-backup-content>
</full-backup-content>
"""

def write_if_needed(path: str, content: str, label: str) -> None:
    try:
        cur = open(path, encoding="utf-8").read()
    except FileNotFoundError:
        cur = None
    if cur == content:
        print(f"[patch-android-no-backup] {label} already current — ok.")
        return
    open(path, "w", encoding="utf-8").write(content)
    print(f"[patch-android-no-backup] Wrote {label}.")

write_if_needed(rules_path, RULES_CONTENT, "data_extraction_rules.xml")
write_if_needed(backup_path, BACKUP_CONTENT, "backup_rules.xml")

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
    # Insert after opening whitespace / first attribute block end — append before trailing space
    return text.rstrip() + f'\n        android:{name}="{value}"\n        '

need = []
if not has_attr("allowBackup", "false"):
    need.append("allowBackup")
if not has_attr("fullBackupContent", "@xml/backup_rules"):
    need.append("fullBackupContent")
if not has_attr("dataExtractionRules", "@xml/data_extraction_rules"):
    need.append("dataExtractionRules")

if not need:
    print(
        "[patch-android-no-backup] Manifest already allowBackup=false + "
        "fullBackupContent/@xml/backup_rules + dataExtractionRules — ok."
    )
    sys.exit(0)

attrs2 = attrs
attrs2 = set_attr(attrs2, "allowBackup", "false")
attrs2 = set_attr(attrs2, "fullBackupContent", "@xml/backup_rules")
attrs2 = set_attr(attrs2, "dataExtractionRules", "@xml/data_extraction_rules")

new_raw = raw[:start] + attrs2 + raw[end:]
# Sanity
app2 = re.search(r"<application\b([\s\S]*?)>", new_raw, re.I)
assert app2 is not None
a2 = app2.group(1)
assert re.search(r'android:allowBackup\s*=\s*["\']false["\']', a2, re.I)
assert re.search(r'android:fullBackupContent\s*=\s*["\']@xml/backup_rules["\']', a2, re.I)
assert re.search(
    r'android:dataExtractionRules\s*=\s*["\']@xml/data_extraction_rules["\']', a2, re.I
)
open(manifest_path, "w", encoding="utf-8").write(new_raw)
print(
    "[patch-android-no-backup] Patched <application>: allowBackup=false, "
    "fullBackupContent=@xml/backup_rules, dataExtractionRules=@xml/data_extraction_rules."
)
PY
