#!/usr/bin/env bash
# Generates an RS256 keypair and prints the base64-encoded PEM values
# suitable for pasting into .env as JWT_PRIVATE_KEY_B64 and JWT_PUBLIC_KEY_B64.
# Usage: bash scripts/generate-jwt-keys.sh
set -euo pipefail

PRIVATE=$(openssl genrsa 2048 2>/dev/null)
PUBLIC=$(echo "$PRIVATE" | openssl rsa -pubout 2>/dev/null)

echo ""
echo "# Paste into api/.env"
echo "JWT_PRIVATE_KEY_B64=$(echo "$PRIVATE" | base64 -w 0)"
echo "JWT_PUBLIC_KEY_B64=$(echo "$PUBLIC" | base64 -w 0)"
echo ""
echo "Keys are ephemeral — store only in .env (never commit)."
