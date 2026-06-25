#!/bin/bash
# Force CocoaPods' generated Embed Pods Frameworks scripts to use the CI keychain.
# This prevents codesign from waiting on a GUI keychain prompt during GitHub Actions archives.
set -euo pipefail

KEYCHAIN_PATH="${D5_KEYCHAIN_PATH:-$HOME/Library/Keychains/fastlane_tmp_keychain-db}"
PATCHED=0
FOUND=0

while IFS= read -r -d '' script; do
  FOUND=1
  if grep -q "D5_KEYCHAIN_PATH" "$script"; then
    echo "Already patched: $script"
    continue
  fi

  tmp="$(mktemp)"
  awk '
    /^code_sign_if_enabled\(\) \{/ && !done {
      print
      print "  if [ -n \"${D5_KEYCHAIN_PATH:-}\" ]; then"
      print "    OTHER_CODE_SIGN_FLAGS=\"${OTHER_CODE_SIGN_FLAGS:-} --keychain ${D5_KEYCHAIN_PATH}\""
      print "  fi"
      done=1
      next
    }
    { print }
  ' "$script" > "$tmp"
  mv "$tmp" "$script"
  chmod +x "$script"
  PATCHED=$((PATCHED + 1))
  echo "Patched codesign keychain in: $script"
done < <(find ios/App/Pods/Target\ Support\ Files -name "*-frameworks.sh" -print0 2>/dev/null)

if [ "$FOUND" -eq 0 ]; then
  echo "No CocoaPods framework embed scripts found. Nothing to patch."
else
  echo "CocoaPods codesign patch complete. patched=$PATCHED keychain=$KEYCHAIN_PATH"
fi
