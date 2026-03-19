#!/bin/sh
# Auto-unseal Vault au démarrage
# Lit l'unseal key depuis /vault/keys/vault-keys.json

set -e

VAULT_ADDR="${VAULT_ADDR:-http://vault:8200}"
KEYS_FILE="/vault/keys/vault-keys.json"

echo "⏳ Attente de Vault..."
for i in $(seq 1 30); do
    if wget -qO- "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
        break
    fi
    # Vault répond 503 quand sealed mais joignable
    if wget -qO- "$VAULT_ADDR/v1/sys/seal-status" 2>/dev/null | grep -q '"initialized":true'; then
        break
    fi
    sleep 1
done

# Vérifie si sealed
SEALED=$(wget -qO- "$VAULT_ADDR/v1/sys/seal-status" | sed -n 's/.*"sealed":\([a-z]*\).*/\1/p')

if [ "$SEALED" = "false" ]; then
    echo "✅ Vault déjà déverrouillé"
    exit 0
fi

if [ ! -f "$KEYS_FILE" ]; then
    echo "❌ Fichier de clés introuvable : $KEYS_FILE"
    exit 1
fi

# Extraire l'unseal key (sans python, avec sed)
UNSEAL_KEY=$(sed -n 's/.*"keys":\["\([^"]*\)".*/\1/p' "$KEYS_FILE")

echo "🔓 Unseal en cours..."
wget -qO- --post-data="{\"key\": \"$UNSEAL_KEY\"}" \
    --header="Content-Type: application/json" \
    "$VAULT_ADDR/v1/sys/unseal" > /dev/null 2>&1

echo "✅ Vault déverrouillé"
