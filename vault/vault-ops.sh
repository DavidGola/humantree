#!/bin/bash
# vault-ops.sh — Opérations Vault production
# Usage: ./vault/vault-ops.sh [init|unseal|setup|status]

set -e

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
export VAULT_ADDR

KEYS_FILE="./vault/.vault-keys.json"

wait_for_vault() {
    echo "⏳ Attente de Vault..."
    for i in $(seq 1 30); do
        if curl -s "$VAULT_ADDR/v1/sys/health" > /dev/null 2>&1; then
            echo "✅ Vault est joignable"
            return 0
        fi
        sleep 1
    done
    echo "❌ Vault n'a pas répondu après 30s"
    exit 1
}

# --- INIT : première initialisation (une seule fois) ---
cmd_init() {
    wait_for_vault

    # Vérifie si déjà initialisé
    INIT_STATUS=$(curl -s "$VAULT_ADDR/v1/sys/init" | python3 -c "import sys,json; print(json.load(sys.stdin)['initialized'])")
    if [ "$INIT_STATUS" = "True" ]; then
        echo "⚠️  Vault est déjà initialisé. Utilise 'unseal' pour déverrouiller."
        return 0
    fi

    echo "🔐 Initialisation de Vault (1 clé, 1 nécessaire pour unseal)..."
    INIT_RESPONSE=$(curl -s -X PUT "$VAULT_ADDR/v1/sys/init" \
        -H "Content-Type: application/json" \
        -d '{"secret_shares": 1, "secret_threshold": 1}')

    # Sauvegarde les clés
    echo "$INIT_RESPONSE" > "$KEYS_FILE"
    chmod 600 "$KEYS_FILE"

    UNSEAL_KEY=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['keys'][0])")
    ROOT_TOKEN=$(echo "$INIT_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['root_token'])")

    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  🔑 SAUVEGARDE CES INFORMATIONS EN LIEU SÛR            ║"
    echo "║  Elles ne seront plus jamais affichées !                ║"
    echo "╠══════════════════════════════════════════════════════════╣"
    echo "║  Unseal Key : $UNSEAL_KEY"
    echo "║  Root Token : $ROOT_TOKEN"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "📁 Clés sauvegardées dans $KEYS_FILE (chmod 600)"
    echo "⚠️  En production, supprime ce fichier et stocke les clés ailleurs !"
    echo ""

    # Auto-unseal après init
    echo "🔓 Unseal automatique..."
    curl -s -X PUT "$VAULT_ADDR/v1/sys/unseal" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"$UNSEAL_KEY\"}" > /dev/null

    echo "✅ Vault est initialisé et déverrouillé"
    export VAULT_TOKEN="$ROOT_TOKEN"

    # Enchaîne avec le setup
    cmd_setup
}

# --- UNSEAL : déverrouiller après un restart ---
cmd_unseal() {
    wait_for_vault

    if [ ! -f "$KEYS_FILE" ]; then
        echo "❌ Fichier $KEYS_FILE introuvable."
        echo "   Entre l'unseal key manuellement :"
        read -r -p "   Unseal Key: " UNSEAL_KEY
    else
        UNSEAL_KEY=$(python3 -c "import json; print(json.load(open('$KEYS_FILE'))['keys'][0])")
    fi

    SEALED=$(curl -s "$VAULT_ADDR/v1/sys/seal-status" | python3 -c "import sys,json; print(json.load(sys.stdin)['sealed'])")
    if [ "$SEALED" = "False" ]; then
        echo "✅ Vault est déjà déverrouillé"
        return 0
    fi

    curl -s -X PUT "$VAULT_ADDR/v1/sys/unseal" \
        -H "Content-Type: application/json" \
        -d "{\"key\": \"$UNSEAL_KEY\"}" > /dev/null

    echo "✅ Vault déverrouillé"
}

# --- SETUP : configurer policy, AppRole, KV engine ---
cmd_setup() {
    # Récupère le root token
    if [ -z "$VAULT_TOKEN" ]; then
        if [ -f "$KEYS_FILE" ]; then
            VAULT_TOKEN=$(python3 -c "import json; print(json.load(open('$KEYS_FILE'))['root_token'])")
            export VAULT_TOKEN
        else
            read -r -p "Root Token: " VAULT_TOKEN
            export VAULT_TOKEN
        fi
    fi

    echo ""
    echo "📦 Activation du KV secrets engine..."
    curl -s -X POST "$VAULT_ADDR/v1/sys/mounts/secret" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"type": "kv", "options": {"version": "2"}}' 2>/dev/null || true

    echo "📋 Création de la policy 'backend'..."
    POLICY_HCL=$(cat ./vault/policy-backend.hcl)
    curl -s -X PUT "$VAULT_ADDR/v1/sys/policies/acl/backend" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"policy\": $(echo "$POLICY_HCL" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))")}"

    echo "🔑 Activation de l'auth AppRole..."
    curl -s -X POST "$VAULT_ADDR/v1/sys/auth/approle" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"type": "approle"}' 2>/dev/null || true

    echo "👤 Création du rôle 'humantree-backend'..."
    curl -s -X POST "$VAULT_ADDR/v1/auth/approle/role/humantree-backend" \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "token_policies": ["backend"],
            "token_ttl": "1h",
            "token_max_ttl": "4h",
            "secret_id_ttl": "0"
        }'

    # Récupère role_id et génère un secret_id
    ROLE_ID=$(curl -s "$VAULT_ADDR/v1/auth/approle/role/humantree-backend/role-id" \
        -H "X-Vault-Token: $VAULT_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['role_id'])")

    SECRET_ID=$(curl -s -X POST "$VAULT_ADDR/v1/auth/approle/role/humantree-backend/secret-id" \
        -H "X-Vault-Token: $VAULT_TOKEN" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['secret_id'])")

    echo ""
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║  🔐 AppRole credentials pour le backend                 ║"
    echo "╠══════════════════════════════════════════════════════════╣"
    echo "║  VAULT_ROLE_ID=$ROLE_ID"
    echo "║  VAULT_SECRET_ID=$SECRET_ID"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo ""
    echo "👉 Ajoute ces valeurs dans ton .env :"
    echo "   VAULT_ROLE_ID=$ROLE_ID"
    echo "   VAULT_SECRET_ID=$SECRET_ID"
    echo ""

    echo "📝 Maintenant, injecte tes secrets manuellement :"
    echo "   export VAULT_ADDR=$VAULT_ADDR"
    echo "   export VAULT_TOKEN=$VAULT_TOKEN"
    echo ""
    echo "   vault kv put secret/humantree/database POSTGRES_USER=xxx POSTGRES_PASSWORD=xxx POSTGRES_DB=xxx"
    echo "   vault kv put secret/humantree/jwt SECRET_KEY=xxx"
    echo "   vault kv put secret/humantree/encryption ENCRYPTION_KEY=xxx"
    echo "   vault kv put secret/humantree/grafana GF_SECURITY_ADMIN_PASSWORD=xxx"
    echo ""
    echo "✅ Setup terminé"
}

# --- STATUS : état de Vault ---
cmd_status() {
    echo "📊 Vault status:"
    curl -s "$VAULT_ADDR/v1/sys/seal-status" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f\"  Initialized: {d['initialized']}\")
print(f\"  Sealed:      {d['sealed']}\")
print(f\"  Version:     {d.get('version', 'N/A')}\")
print(f\"  Storage:     {d.get('storage_type', 'N/A')}\")
"
}

# --- MAIN ---
case "${1:-}" in
    init)   cmd_init ;;
    unseal) cmd_unseal ;;
    setup)  cmd_setup ;;
    status) cmd_status ;;
    *)
        echo "Usage: $0 {init|unseal|setup|status}"
        echo ""
        echo "  init    — Première initialisation (génère unseal key + root token, configure tout)"
        echo "  unseal  — Déverrouiller Vault après un restart"
        echo "  setup   — Recréer policy + AppRole (si Vault déjà init)"
        echo "  status  — Afficher l'état de Vault"
        exit 1
        ;;
esac
