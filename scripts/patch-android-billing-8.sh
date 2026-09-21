#!/usr/bin/env bash
# Idempotent Play Billing Library ≥8 patch for Cap6 @capgo/native-purchases@6.0.42.
# Play Console rejects AABs that ship Billing <8.0.0. Cap6 plugin pins 6.2.1 and
# uses Billing 6 APIs that do not compile against Billing 8:
#   - BillingClient.Builder.enablePendingPurchases()  → PendingPurchasesParams
#   - ProductDetailsResponseListener(List<ProductDetails>) → QueryProductDetailsResult
# Billing 8.3.0 also declares minSdk 23 (Cap6 default minSdk 22) — bump variables.gradle.
# Stay on Capacitor 6: patch node_modules (re-applied after every npm install / cap sync).
# Safe to re-run. Does NOT upgrade Capacitor. Does NOT touch AdMob test IDs / USE_TEST_ADS.
# ANDROID-BILLING-CLIENT-8
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_ANDROID="$ROOT/node_modules/@capgo/native-purchases/android"
PLUGIN_GRADLE="$PLUGIN_ANDROID/build.gradle"
PLUGIN_JAVA="$PLUGIN_ANDROID/src/main/java/ee/forgr/nativepurchases/NativePurchasesPlugin.java"
APP_GRADLE="$ROOT/android/app/build.gradle"
VARS_GRADLE="$ROOT/android/variables.gradle"
BILLING_VERSION="8.3.0"
MIN_SDK=23

log() { echo "[patch-android-billing-8] $*"; }

if [[ ! -d "$PLUGIN_ANDROID" ]]; then
  log "node_modules/@capgo/native-purchases/android not found — skip (run npm install first)."
  exit 0
fi

if [[ ! -f "$PLUGIN_GRADLE" ]]; then
  log "ERROR: missing $PLUGIN_GRADLE" >&2
  exit 1
fi

if [[ ! -f "$PLUGIN_JAVA" ]]; then
  log "ERROR: missing $PLUGIN_JAVA" >&2
  exit 1
fi

# --- 1) build.gradle: billing_version = 8.3.0 ---
python3 - "$PLUGIN_GRADLE" "$BILLING_VERSION" <<'PY'
import re, sys
path, ver = sys.argv[1], sys.argv[2]
raw = open(path, encoding="utf-8").read()
pat = r'(billing_version\s*=\s*")([^"]+)(")'
m = re.search(pat, raw)
if not m:
    sys.stderr.write("ERROR: billing_version not found in plugin build.gradle\n")
    sys.exit(1)
if m.group(2) == ver:
    print(f"[patch-android-billing-8] plugin build.gradle already billing_version={ver} — ok.")
else:
    new = re.sub(pat, rf'\g<1>{ver}\g<3>', raw, count=1)
    open(path, "w", encoding="utf-8").write(new)
    assert f'billing_version = "{ver}"' in open(path, encoding="utf-8").read()
    print(f"[patch-android-billing-8] Patched plugin build.gradle: billing_version {m.group(2)} → {ver}.")
PY

# --- 2) NativePurchasesPlugin.java: Billing 8 API migrate ---
python3 - "$PLUGIN_JAVA" <<'PY'
import re, sys

path = sys.argv[1]
raw = open(path, encoding="utf-8").read()
orig = raw
changed = []

def ensure_import(text, stmt):
    if stmt in text:
        return text, False
    m = list(re.finditer(r"^import com\.android\.billingclient\.api\.[^\n]+;\n", text, re.M))
    if not m:
        sys.stderr.write(f"ERROR: no billingclient imports to anchor for {stmt}\n")
        sys.exit(1)
    idx = m[-1].end()
    return text[:idx] + stmt + "\n" + text[idx:], True

raw, c = ensure_import(raw, "import com.android.billingclient.api.PendingPurchasesParams;")
if c:
    changed.append("import PendingPurchasesParams")
raw, c = ensure_import(raw, "import com.android.billingclient.api.QueryProductDetailsResult;")
if c:
    changed.append("import QueryProductDetailsResult")

old_pending = ".enablePendingPurchases()"
new_pending = (
    ".enablePendingPurchases("
    "PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())"
)
if "PendingPurchasesParams.newBuilder().enableOneTimeProducts()" in raw:
    pass
elif old_pending in raw:
    raw = raw.replace(old_pending, new_pending, 1)
    changed.append("enablePendingPurchases(PendingPurchasesParams)")
else:
    sys.stderr.write(
        "ERROR: enablePendingPurchases() not found and not already migrated\n"
    )
    sys.exit(1)

sig_pat = re.compile(
    r"public void onProductDetailsResponse\(\s*"
    r"BillingResult billingResult,\s*"
    r"List<ProductDetails> productDetailsList\s*\)\s*\{",
    re.M,
)
replacement = (
    "public void onProductDetailsResponse(\n"
    "            BillingResult billingResult,\n"
    "            QueryProductDetailsResult queryProductDetailsResult\n"
    "          ) {\n"
    "            List<ProductDetails> productDetailsList =\n"
    "              queryProductDetailsResult.getProductDetailsList();"
)
count = len(sig_pat.findall(raw))
if count == 0:
    if "QueryProductDetailsResult queryProductDetailsResult" not in raw:
        sys.stderr.write(
            "ERROR: onProductDetailsResponse List<ProductDetails> signature not found\n"
        )
        sys.exit(1)
else:
    raw, n = sig_pat.subn(replacement, raw)
    changed.append(f"onProductDetailsResponse→QueryProductDetailsResult x{n}")

if raw != orig:
    open(path, "w", encoding="utf-8").write(raw)

check = open(path, encoding="utf-8").read()
assert "PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()" in check
assert "QueryProductDetailsResult queryProductDetailsResult" in check
assert "queryProductDetailsResult.getProductDetailsList()" in check
assert ".enablePendingPurchases()" not in check
assert not re.search(
    r"onProductDetailsResponse\(\s*BillingResult billingResult,\s*List<ProductDetails>",
    check,
), "old List signature still present"

if changed:
    print("[patch-android-billing-8] Java Billing-8 migrate: " + ", ".join(changed))
else:
    print("[patch-android-billing-8] NativePurchasesPlugin.java already Billing-8 — ok.")
PY

# --- 3) Optional force in android/app/build.gradle ---
if [[ -f "$APP_GRADLE" ]]; then
  python3 - "$APP_GRADLE" "$BILLING_VERSION" <<'PY'
import re, sys
path, ver = sys.argv[1], sys.argv[2]
raw = open(path, encoding="utf-8").read()
force_snip = (
    "\n// Play requires Billing Library ≥8.0.0 (Cap6 @capgo/native-purchases pins 6.2.1).\n"
    "// Forced here so transitive deps cannot drag Billing <8 back in. Idempotent patch.\n"
    "configurations.all {\n"
    "    resolutionStrategy {\n"
    f"        force 'com.android.billingclient:billing:{ver}'\n"
    "    }\n"
    "}\n"
)
if f"force 'com.android.billingclient:billing:{ver}'" in raw:
    print(f"[patch-android-billing-8] android/app/build.gradle already forces billing:{ver} — ok.")
elif "force 'com.android.billingclient:billing:" in raw:
    raw2 = re.sub(
        r"force 'com\.android\.billingclient:billing:[^']+'",
        f"force 'com.android.billingclient:billing:{ver}'",
        raw,
        count=1,
    )
    open(path, "w", encoding="utf-8").write(raw2)
    print(f"[patch-android-billing-8] Updated force billing → {ver} in android/app/build.gradle.")
else:
    open(path, "a", encoding="utf-8").write(force_snip)
    print(f"[patch-android-billing-8] Appended resolutionStrategy force billing:{ver} to android/app/build.gradle.")
assert f"force 'com.android.billingclient:billing:{ver}'" in open(path, encoding="utf-8").read()
PY
else
  log "android/app/build.gradle not found — skip force (run npx cap add android first)."
fi

# --- 4) Billing 8.x requires minSdk ≥23 (Cap6 default is 22) ---
if [[ -f "$VARS_GRADLE" ]]; then
  python3 - "$VARS_GRADLE" "$MIN_SDK" <<'PY'
import re, sys
path, want = sys.argv[1], int(sys.argv[2])
raw = open(path, encoding="utf-8").read()
pat = r'(minSdkVersion\s*=\s*)(\d+)'
m = re.search(pat, raw)
if not m:
    sys.stderr.write("ERROR: minSdkVersion not found in variables.gradle\n")
    sys.exit(1)
cur = int(m.group(2))
if cur >= want:
    print(f"[patch-android-billing-8] variables.gradle minSdkVersion={cur} (≥{want}) — ok.")
else:
    raw2 = re.sub(pat, rf'\g<1>{want}', raw, count=1)
    open(path, "w", encoding="utf-8").write(raw2)
    assert re.search(rf'minSdkVersion\s*=\s*{want}\b', open(path, encoding="utf-8").read())
    print(f"[patch-android-billing-8] Patched variables.gradle: minSdkVersion {cur} → {want} (Billing 8 requires ≥23).")
PY
else
  log "android/variables.gradle not found — skip minSdk bump."
fi

log "Done. Billing Library target: ${BILLING_VERSION} (Play ≥8.0.0). Cap stays on 6."
