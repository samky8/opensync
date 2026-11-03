#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v xcodegen >/dev/null || { echo "Install XcodeGen: brew install xcodegen"; exit 1; }
xcodegen generate
mode="${1:-test}"
case "$mode" in
  test)
    device="${SIMULATOR_ID:-$(xcrun simctl list devices available -j | python3 -c 'import sys,json; d=json.load(sys.stdin); print(next(x["udid"] for group in d["devices"].values() for x in group if x["name"].startswith("iPhone")))')}"
    xcodebuild -project OpenSync.xcodeproj -scheme OpenSync -destination "platform=iOS Simulator,id=$device" -derivedDataPath build/DerivedData -resultBundlePath "build/Tests-$(date +%s).xcresult" CODE_SIGNING_ALLOWED=NO test
    ;;
  archive)
    : "${DEVELOPMENT_TEAM:?Set your Apple Developer team ID}"
    test -f Config/Local.xcconfig || { echo "Configure Config/Local.xcconfig before archiving."; exit 1; }
    xcodebuild -project OpenSync.xcodeproj -scheme OpenSync -configuration Release -showBuildSettings -json | python3 scripts/check-release.py
    xcodebuild -project OpenSync.xcodeproj -scheme OpenSync -configuration Release -destination 'generic/platform=iOS' -archivePath build/OpenSync.xcarchive DEVELOPMENT_TEAM="$DEVELOPMENT_TEAM" -allowProvisioningUpdates archive
    ;;
  export)
    : "${DEVELOPMENT_TEAM:?Set your Apple Developer team ID}"
    mkdir -p build
    cp ExportOptions.plist build/ExportOptions.plist
    /usr/libexec/PlistBuddy -c "Set :teamID $DEVELOPMENT_TEAM" build/ExportOptions.plist
    xcodebuild -exportArchive -archivePath build/OpenSync.xcarchive -exportPath build/export -exportOptionsPlist build/ExportOptions.plist -allowProvisioningUpdates
    ;;
  *) echo 'Usage: bash scripts/build.sh [test|archive|export]'; exit 1 ;;
esac
