#!/usr/bin/env bash
# One-time: create the release keystore and store it as GitHub Actions secrets.
# Keep the keystore backup safe — losing it means phones can't update the app
# without uninstalling (and losing local data).
set -euo pipefail

REPO="${1:-RLT-Newside/JBirthdays}"
ALIAS="jbirthdays"
OUT="${HOME}/.jbirthdays-release.keystore"

if [ -e "$OUT" ]; then
  echo "Keystore already exists at $OUT — reusing it."
  read -rsp "Keystore password: " PASS; echo
else
  PASS="$(openssl rand -base64 24 | tr -d '/+=')"
  keytool -genkeypair -v -keystore "$OUT" -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$PASS" -keypass "$PASS" \
    -dname "CN=JBirthdays, O=RLT-Newside"
  echo "Keystore written to $OUT"
  echo "Password (save it in your password manager): $PASS"
fi

base64 -w0 "$OUT" | gh secret set KEYSTORE_BASE64 --repo "$REPO"
printf '%s' "$ALIAS" | gh secret set KEY_ALIAS --repo "$REPO"
printf '%s' "$PASS" | gh secret set KEYSTORE_PASSWORD --repo "$REPO"
echo "Secrets set on $REPO."
