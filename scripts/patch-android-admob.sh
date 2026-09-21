#!/usr/bin/env bash
# Idempotent AdMob + Billing Manifest patch for local android/ (gitignored).
# Safe no-op if android/ missing or already patched. Exit 0 always on success path.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="$ROOT/android"
MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
STRINGS="$ANDROID_DIR/app/src/main/res/values/strings.xml"
CAP_CFG="$ROOT/capacitor.config.json"
# Prefer live App ID from capacitor.config.json (prod after Play link); fallback Google sample.
SAMPLE_APP_ID="ca-app-pub-3940256099942544~3347511713"
if [[ -f "$CAP_CFG" ]] && command -v node >/dev/null 2>&1; then
  _from_cfg="$(node -e "try{const c=require(process.argv[1]);const id=c&&c.plugins&&c.plugins.AdMob&&c.plugins.AdMob.appIdAndroid; if(id) process.stdout.write(String(id))}catch(e){}" "$CAP_CFG" 2>/dev/null || true)"
  if [[ -n "${_from_cfg:-}" ]]; then
    SAMPLE_APP_ID="$_from_cfg"
  fi
fi

log() { echo "[patch-android-admob] $*"; }
log_zh() { echo "[patch-android-admob] $*"; }

if [[ ! -d "$ANDROID_DIR" ]]; then
  log "android/ not found — skip (run npx cap add android first)."
  log_zh "找不到 android/ — 略過（請先 npx cap add android）。"
  exit 0
fi

if [[ ! -f "$MANIFEST" ]]; then
  log "ERROR: AndroidManifest.xml missing at $MANIFEST" >&2
  exit 1
fi

mkdir -p "$(dirname "$STRINGS")"

# --- strings.xml: admob_app_id ---
if [[ ! -f "$STRINGS" ]]; then
  cat > "$STRINGS" << STRINGS_EOF
<?xml version='1.0' encoding='utf-8'?>
<resources>
    <string name="admob_app_id">${SAMPLE_APP_ID}</string>
</resources>
STRINGS_EOF
  log "Created strings.xml with admob_app_id (Google sample)."
  log_zh "已建立 strings.xml 並寫入 admob_app_id（Google 示範 ID）。"
elif grep -q 'name="admob_app_id"' "$STRINGS"; then
  # Always sync value to SAMPLE_APP_ID (prod switch must overwrite Google sample).
  tmp="$(mktemp)"
  sed -E "s|(<string name=\"admob_app_id\">)[^<]*(</string>)|\1${SAMPLE_APP_ID}\2|" "$STRINGS" > "$tmp"
  mv "$tmp" "$STRINGS"
  log "Synced admob_app_id → ${SAMPLE_APP_ID}"
  log_zh "已同步 admob_app_id → ${SAMPLE_APP_ID}"
else
  # Insert before </resources>
  if grep -q '</resources>' "$STRINGS"; then
    # Portable in-place via temp file
    tmp="$(mktemp)"
    awk -v id="$SAMPLE_APP_ID" '
      /<\/resources>/ && !done {
        print "    <string name=\"admob_app_id\">" id "</string>"
        done=1
      }
      { print }
    ' "$STRINGS" > "$tmp"
    mv "$tmp" "$STRINGS"
    log "Added admob_app_id to strings.xml (Google sample)."
    log_zh "已在 strings.xml 補上 admob_app_id（Google 示範 ID）。"
  else
    log "ERROR: strings.xml has no </resources>" >&2
    exit 1
  fi
fi

# --- AndroidManifest.xml: APPLICATION_ID meta-data ---
if grep -q 'com.google.android.gms.ads.APPLICATION_ID' "$MANIFEST"; then
  log "APPLICATION_ID meta-data already present — ok."
  log_zh "Manifest 已有 APPLICATION_ID meta-data — 略過。"
else
  if ! grep -q '</application>' "$MANIFEST"; then
    log "ERROR: Manifest has no </application>" >&2
    exit 1
  fi
  tmp="$(mktemp)"
  awk '
    /<\/application>/ && !done {
      print "        <meta-data"
      print "            android:name=\"com.google.android.gms.ads.APPLICATION_ID\""
      print "            android:value=\"@string/admob_app_id\"/>"
      done=1
    }
    { print }
  ' "$MANIFEST" > "$tmp"
  mv "$tmp" "$MANIFEST"
  log "Inserted APPLICATION_ID meta-data into <application>."
  log_zh "已在 <application> 插入 APPLICATION_ID meta-data。"
fi

# --- AndroidManifest.xml: BILLING permission ---
if grep -q 'com.android.vending.BILLING' "$MANIFEST"; then
  log "BILLING permission already present — ok."
  log_zh "Manifest 已有 BILLING 權限 — 略過。"
else
  tmp="$(mktemp)"
  if grep -q 'android.permission.INTERNET' "$MANIFEST"; then
    awk '
      /android.permission.INTERNET/ && !done {
        print
        print "    <uses-permission android:name=\"com.android.vending.BILLING\" />"
        done=1
        next
      }
      { print }
    ' "$MANIFEST" > "$tmp"
  elif grep -q '</manifest>' "$MANIFEST"; then
    awk '
      /<\/manifest>/ && !done {
        print "    <uses-permission android:name=\"com.android.vending.BILLING\" />"
        done=1
      }
      { print }
    ' "$MANIFEST" > "$tmp"
  else
    log "ERROR: cannot find insertion point for BILLING" >&2
    exit 1
  fi
  mv "$tmp" "$MANIFEST"
  log "Added com.android.vending.BILLING permission."
  log_zh "已補上 com.android.vending.BILLING 權限。"
fi

log "Done. Manifest + strings ready for AdMob native init (test App ID)."
log_zh "完成。Manifest／strings 已就緒（測試 App ID；正式 ID 待 Play 過審後替換）。"
exit 0
