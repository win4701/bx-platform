#!/bin/bash

echo "🔐 Generating Strong INTERNAL_SECRET..."

SECRET=$(openssl rand -base64 64 | tr -d '\n')

echo ""
echo "INTERNAL_SECRET="
echo "$SECRET"
echo ""
echo "⚠️ Store it securely and set it using:"
echo "fly secrets set INTERNAL_SECRET=\"$SECRET\""
