#!/usr/bin/env bash
# New ephemeral GitHub-hosted signing wrapper; reuses the existing IPA exporter.
set -euo pipefail
cd "$(dirname "$0")/.."
[[ "$(uname -s)" == Darwin && "${GITHUB_ACTIONS:-}" == true && "${RUNNER_ENVIRONMENT:-}" == github-hosted ]] || {
  echo 'This signing wrapper only runs on ephemeral GitHub-hosted macOS runners.' >&2; exit 1;
}
: "${RUNNER_TEMP:?}" "${IOS_CERTIFICATE_BASE64:?Missing certificate secret}" "${IOS_CERTIFICATE_PASSWORD:?Missing certificate password}" "${IOS_PROFILE_BASE64:?Missing profile secret}"
: "${TEAM_ID:?}" "${BUNDLE_ID:?}" "${VITE_PRIVACY_URL:?Missing VITE_PRIVACY_URL}" "${FRONTLINE_STORE_PRODUCT_ID:?Missing FRONTLINE_STORE_PRODUCT_ID}"
: "${FRONTLINE_STORE_MODE:=sandbox}"
[[ "$FRONTLINE_STORE_MODE" == sandbox || "$FRONTLINE_STORE_MODE" == production ]] || { echo 'FRONTLINE_STORE_MODE must be sandbox or production.' >&2; exit 1; }
[[ "$FRONTLINE_STORE_PRODUCT_ID" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]] || { echo 'Invalid FRONTLINE_STORE_PRODUCT_ID.' >&2; exit 1; }
[[ "$BUNDLE_ID" != "com.frontlinegame.app" ]] || { echo 'Refusing to sign the development placeholder bundle identifier.' >&2; exit 1; }
node - <<'NODE'
const privacy = process.env.VITE_PRIVACY_URL?.trim();
const url = new URL(privacy);
if (url.protocol !== 'https:' || url.username || url.password || url.hash || ['localhost','127.0.0.1','::1'].includes(url.hostname))
  throw new Error('VITE_PRIVACY_URL must be a public HTTPS privacy-policy URL.');
NODE
umask 077
signing_dir="$(mktemp -d "$RUNNER_TEMP/frontline-signing.XXXXXX")"
keychain="$signing_dir/signing.keychain-db"
installed_profile=''
old_keychains=()
while IFS= read -r entry; do old_keychains+=("$entry"); done < <(security list-keychains -d user | python3 -c 'import shlex,sys; print("\n".join(shlex.split(sys.stdin.read())))')
cleanup() {
  security list-keychains -d user -s "${old_keychains[@]}" >/dev/null 2>&1 || true
  security delete-keychain "$keychain" >/dev/null 2>&1 || true
  if [[ -n "$installed_profile" ]]; then rm -f "$installed_profile"; fi
  rm -rf "$signing_dir"
}
trap cleanup EXIT
export FRONTLINE_SIGNING_DIR="$signing_dir"
python3 - <<'PY'
import base64, os
from pathlib import Path
root = Path(os.environ['FRONTLINE_SIGNING_DIR'])
for variable, filename in [('IOS_CERTIFICATE_BASE64', 'certificate.p12'), ('IOS_PROFILE_BASE64', 'profile.mobileprovision')]:
    (root / filename).write_bytes(base64.b64decode(''.join(os.environ[variable].split()), validate=True))
PY
keychain_password="$(openssl rand -hex 32)"
security create-keychain -p "$keychain_password" "$keychain"
security set-keychain-settings -lut 3600 "$keychain"
security unlock-keychain -p "$keychain_password" "$keychain"
security import "$signing_dir/certificate.p12" -P "$IOS_CERTIFICATE_PASSWORD" -t cert -f pkcs12 -k "$keychain" -T /usr/bin/codesign -T /usr/bin/security >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$keychain_password" "$keychain" >/dev/null
security list-keychains -d user -s "$keychain" "${old_keychains[@]}"
security cms -D -i "$signing_dir/profile.mobileprovision" > "$signing_dir/profile.plist"
security find-identity -v -p codesigning "$keychain" > "$signing_dir/identities.txt"
python3 scripts/ios-profile.py "$signing_dir/profile.plist" "$signing_dir/identities.txt" "$signing_dir/validated.txt"
export PROFILE_UUID="$(sed -n '1p' "$signing_dir/validated.txt")"
export SIGNING_IDENTITY="$(sed -n '2p' "$signing_dir/validated.txt")"
profile_dir="$HOME/Library/MobileDevice/Provisioning Profiles"
mkdir -p "$profile_dir"
profile_path="$profile_dir/$PROFILE_UUID.mobileprovision"
[[ ! -e "$profile_path" ]] || { echo 'Profile already exists; refusing to overwrite it.' >&2; exit 1; }
cp "$signing_dir/profile.mobileprovision" "$profile_path"
installed_profile="$profile_path"
unset IOS_CERTIFICATE_BASE64 IOS_CERTIFICATE_PASSWORD IOS_PROFILE_BASE64 keychain_password
export SIGNING_STYLE=manual
bash scripts/ios-ipa.sh
