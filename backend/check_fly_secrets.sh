#!/bin/bash

echo "🔎 Checking Fly Secrets..."

REQUIRED_SECRETS=(
  "MASTER_SEED"
  "RPC_URL"
  "DATABASE_URL"
  "TELEGRAM_BOT_TOKEN"
  "ADMIN_TOKEN"
  "INTERNAL_SECRET"
)

MISSING=0

for SECRET in "${REQUIRED_SECRETS[@]}"; do
    if ! fly secrets list | grep -q "$SECRET"; then
        echo "❌ Missing Secret: $SECRET"
        MISSING=1
    else
        echo "✅ Found: $SECRET"
    fi
done

if [ $MISSING -eq 1 ]; then
    echo ""
    echo "🚨 Some secrets are missing. Please configure them."
else
    echo ""
    echo "🎉 All required secrets are set."
fi
