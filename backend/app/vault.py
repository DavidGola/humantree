"""Client Vault pour récupérer les secrets depuis HashiCorp Vault.

Flow prod (AppRole) :
1. Le backend s'authentifie avec VAULT_ROLE_ID + VAULT_SECRET_ID
2. Vault renvoie un token temporaire (TTL 1h)
3. Le backend utilise ce token pour lire les secrets

Fallback dev :
- Si VAULT_ADDR absent → os.getenv() classique
- Si VAULT_TOKEN présent → mode dev (token statique, pas d'AppRole)
"""

import os
import logging
import httpx

logger = logging.getLogger(__name__)

VAULT_ADDR = os.getenv("VAULT_ADDR")

# Cache
_cache: dict[str, dict[str, str]] = {}
_token: str | None = None


def _get_token() -> str | None:
    """Obtient un token Vault via AppRole ou env var."""
    global _token
    if _token:
        return _token

    # Mode dev : token statique
    static_token = os.getenv("VAULT_TOKEN")
    if static_token:
        _token = static_token
        return _token

    # Mode prod : AppRole authentication
    role_id = os.getenv("VAULT_ROLE_ID")
    secret_id = os.getenv("VAULT_SECRET_ID")

    if not VAULT_ADDR or not role_id or not secret_id:
        return None

    try:
        resp = httpx.post(
            f"{VAULT_ADDR}/v1/auth/approle/login",
            json={"role_id": role_id, "secret_id": secret_id},
            timeout=5,
        )
        resp.raise_for_status()
        _token = resp.json()["auth"]["client_token"]
        ttl = resp.json()["auth"]["lease_duration"]
        logger.info("vault_auth", extra={"method": "approle", "ttl": ttl})
        return _token
    except Exception as e:
        logger.warning("vault_auth_failed", extra={"error": str(e)})
        return None


def _fetch_secret(path: str) -> dict[str, str]:
    """Lit un secret depuis Vault KV v2."""
    if path in _cache:
        return _cache[path]

    token = _get_token()
    if not VAULT_ADDR or not token:
        return {}

    url = f"{VAULT_ADDR}/v1/secret/data/{path}"
    try:
        resp = httpx.get(url, headers={"X-Vault-Token": token}, timeout=5)
        resp.raise_for_status()
        data = resp.json()["data"]["data"]
        _cache[path] = data
        logger.info("vault_read", extra={"path": path, "keys": list(data.keys())})
        return data
    except Exception as e:
        logger.warning("vault_read_failed", extra={"path": path, "error": str(e)})
        return {}


def get_secret(path: str, key: str, fallback_env: str | None = None) -> str:
    """Récupère un secret depuis Vault, avec fallback sur env var.

    Args:
        path: Chemin Vault (ex: "humantree/database")
        key: Clé dans le secret (ex: "POSTGRES_PASSWORD")
        fallback_env: Nom de la variable d'environnement en fallback
    """
    data = _fetch_secret(path)
    value = data.get(key)

    if value:
        return value

    # Fallback sur env var
    if fallback_env:
        return os.getenv(fallback_env, "")

    return os.getenv(key, "")
