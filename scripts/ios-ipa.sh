#!/usr/bin/env bash
# New local Mac export path; never uploads an archive to Apple.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ "${1:-}" == "--help" ]]; then
  echo 'TEAM_ID=YOURTEAMID BUNDLE_ID=your.registered.bundle npm run ios:ipa'
  echo 'Requires macOS, Xcode 26+, Apple development signing and a registered test iPhone.'
  echo 'EXPORT_METHOD=debugging (default) or release-testing. FRONTLINE_STORE_MODE=sandbox|production.'
  echo 'FRONTLINE_STORE_PRODUCT_ID must match the App Store Connect product for signed release builds.'
  echo 'Output: releases/ios/<timestamp>/'
  exit 0
fi
[[ "$(uname -s)" == Darwin ]] || { echo 'IPA export requires macOS and Xcode. This host cannot sign an iPhone app.' >&2; exit 1; }
command -v xcodebuild >/dev/null || { echo 'Install/select Xcode 26+ first.' >&2; exit 1; }
[[ "${TEAM_ID:-}" =~ ^[A-Z0-9]{10}$ ]] || { echo 'Set TEAM_ID to your 10-character Apple team identifier.' >&2; exit 1; }
[[ "${BUNDLE_ID:-}" =~ ^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)+$ ]] || { echo 'Set BUNDLE_ID to your registered app identifier.' >&2; exit 1; }
[[ "$BUNDLE_ID" != "com.frontlinegame.app" ]] || { echo 'Refusing to export the development placeholder bundle identifier.' >&2; exit 1; }
store_mode="${FRONTLINE_STORE_MODE:-sandbox}"
[[ "$store_mode" == sandbox || "$store_mode" == production ]] || { echo 'FRONTLINE_STORE_MODE must be sandbox or production.' >&2; exit 1; }
store_product_id="${FRONTLINE_STORE_PRODUCT_ID:-frontline.supporter}"
[[ "$store_product_id" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$ ]] || { echo 'Set FRONTLINE_STORE_PRODUCT_ID to the App Store Connect product identifier.' >&2; exit 1; }
method="${EXPORT_METHOD:-debugging}"
[[ "$method" == debugging || "$method" == release-testing ]] || { echo 'Only personal-device export methods are permitted by this script.' >&2; exit 1; }
xcode_major="$(xcodebuild -version | awk '/Xcode/{split($2,v,".");print v[1]}')"
(( xcode_major >= 26 )) || { echo 'Capacitor 8 requires Xcode 26 or newer.' >&2; exit 1; }
npm run ios:sync
output="$(pwd)/releases/ios/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$output"
style="${SIGNING_STYLE:-automatic}"
[[ "$style" == automatic || "$style" == manual ]] || { echo 'Invalid signing style.' >&2; exit 1; }
export TEAM_ID BUNDLE_ID
export EXPORT_METHOD="$method" SIGNING_STYLE="$style" FRONTLINE_EXPORT_OPTIONS="$output/ExportOptions.plist"
if [[ "$style" == manual ]]; then
  [[ "${PROFILE_UUID:-}" =~ ^[A-Fa-f0-9-]{36}$ && "${SIGNING_IDENTITY:-}" =~ ^[A-Fa-f0-9]{40}$ ]] || { echo 'Manual signing requires validated PROFILE_UUID and SIGNING_IDENTITY.' >&2; exit 1; }
fi
python3 - <<'PYTHON'
import os, plistlib
options = dict(method=os.environ['EXPORT_METHOD'], teamID=os.environ['TEAM_ID'], signingStyle=os.environ['SIGNING_STYLE'], destination='export', manageAppVersionAndBuildNumber=False)
if os.environ['SIGNING_STYLE'] == 'manual':
    options['provisioningProfiles'] = {os.environ['BUNDLE_ID']: os.environ['PROFILE_UUID']}
    options['signingCertificate'] = os.environ['SIGNING_IDENTITY']
with open(os.environ['FRONTLINE_EXPORT_OPTIONS'], 'wb') as output:
    plistlib.dump(options, output)
PYTHON
signing_args=(CODE_SIGN_STYLE=Automatic -allowProvisioningUpdates)
export_args=(-allowProvisioningUpdates)
if [[ "$style" == manual ]]; then
  # Scope the profile to the app target, never to Swift-package resource bundles.
  project_file="ios/App/App.xcodeproj/project.pbxproj"
  project_backup="$(mktemp)"
  cp "$project_file" "$project_backup"
  restore_project() { cp "$project_backup" "$project_file"; rm -f "$project_backup"; }
  trap restore_project EXIT
  python3 - <<'PYTHON'
import os
from pathlib import Path
project = Path('ios/App/App.xcodeproj/project.pbxproj')
source = project.read_text()
marker = 'CODE_SIGN_STYLE = Automatic;'
if source.count(marker) != 2:
    raise SystemExit('Expected the two existing app signing configurations; project layout changed.')
replacement = 'CODE_SIGN_STYLE = Manual; CODE_SIGN_IDENTITY = "' + os.environ['SIGNING_IDENTITY'] + '"; PROVISIONING_PROFILE_SPECIFIER = "' + os.environ['PROFILE_UUID'] + '";'
project.write_text(source.replace(marker, replacement))
PYTHON
  signing_args=()
  export_args=()
fi
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release \
  -destination 'generic/platform=iOS' -archivePath "$output/Frontline.xcarchive" \
  DEVELOPMENT_TEAM="$TEAM_ID" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID" \
  FRONTLINE_STORE_MODE="$store_mode" FRONTLINE_STORE_PRODUCT_ID="$store_product_id" \
  "${signing_args[@]}" archive
archive_app="$output/Frontline.xcarchive/Products/Applications/App.app"
[[ -d "$archive_app" ]] || { echo 'Archived App.app missing.' >&2; exit 1; }
actual_bundle="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$archive_app/Info.plist")"
[[ "$actual_bundle" == "$BUNDLE_ID" ]] || { echo "Archive bundle id mismatch: $actual_bundle" >&2; exit 1; }
actual_store_mode="$(/usr/libexec/PlistBuddy -c 'Print :FrontlineStoreMode' "$archive_app/Info.plist")"
actual_store_product="$(/usr/libexec/PlistBuddy -c 'Print :FrontlineStoreProductID' "$archive_app/Info.plist")"
[[ "$actual_store_mode" == "$store_mode" ]] || { echo "Archive StoreKit mode mismatch: $actual_store_mode" >&2; exit 1; }
[[ "$actual_store_product" == "$store_product_id" ]] || { echo "Archive StoreKit product mismatch: $actual_store_product" >&2; exit 1; }
privacy_manifest="$(find "$archive_app" -name PrivacyInfo.xcprivacy -type f -print -quit)"
[[ -n "$privacy_manifest" ]] || { echo 'PrivacyInfo.xcprivacy missing from archive.' >&2; exit 1; }
printf 'Verified archive identity %s, StoreKit %s/%s and privacy manifest %s\n' "$actual_bundle" "$actual_store_mode" "$actual_store_product" "$privacy_manifest"
xcodebuild -exportArchive -archivePath "$output/Frontline.xcarchive" \
  -exportOptionsPlist "$output/ExportOptions.plist" -exportPath "$output" "${export_args[@]}"
printf 'Export complete: %s\n' "$output"
