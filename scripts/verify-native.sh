#!/usr/bin/env bash
# Verifies Capacitor native project scaffolding is present and synced.
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

fail=0
check() {
  if [[ -e "$1" ]]; then
    echo "OK  $1"
  else
    echo "MISS $1"
    fail=1
  fi
}

echo "== Capacitor native project check =="
check "capacitor.config.ts"
check "www/index.html"
check "android/app/build.gradle"
check "android/app/src/main/AndroidManifest.xml"
check "android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png"
check "ios/App/App.xcodeproj/project.pbxproj"
check "ios/App/App/Info.plist"
check "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png"
check "docs/STORE_ACCOUNTS.md"
check "docs/STORE_SUBMIT.md"
check "docs/LOCAL_BUILDS.md"

if command -v npx >/dev/null 2>&1; then
  echo
  echo "== cap sync (dry validation) =="
  npx cap sync >/dev/null
  echo "OK  cap sync"
fi

echo
if [[ "$fail" -ne 0 ]]; then
  echo "Native project check FAILED"
  exit 1
fi
echo "Native project check PASSED"
echo
echo "Next: install Xcode + Android Studio, then see docs/LOCAL_BUILDS.md"
