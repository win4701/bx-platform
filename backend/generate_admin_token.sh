#!/bin/bash

echo "🛡 Generating Secure ADMIN_TOKEN..."

TOKEN=$(openssl rand -hex 48)

echo ""
echo "ADMIN_TOKEN="
echo "$TOKEN"
echo ""
echo "Set it using:"
echo "fly secrets set ADMIN_TOKEN=\"$TOKEN\""
