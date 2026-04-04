"""Tests du flow refresh token : rotation, expiration, réutilisation."""

from datetime import UTC, datetime, timedelta

import pytest
from sqlalchemy import insert

from app.models.tokens import Token
from tests.conftest import register_user


async def _get_cookies(client, username="testuser", password="password123") -> dict:
    """Login et retourne les cookies (access_token + refresh_token)."""
    response = await client.post(
        "/api/v1/users/login",
        data={"username": username, "password": password},
    )
    assert response.status_code == 200
    return dict(response.cookies)


# ========== HAPPY PATH ==========


@pytest.mark.asyncio
async def test_refresh_returns_new_tokens(client):
    """Un refresh valide retourne de nouveaux cookies access + refresh."""
    await register_user(client)
    cookies = await _get_cookies(client)

    response = await client.post("/api/v1/users/refresh", cookies=cookies)

    assert response.status_code == 200
    new_cookies = dict(response.cookies)
    assert "access_token" in new_cookies
    assert "refresh_token" in new_cookies


@pytest.mark.asyncio
async def test_refresh_new_access_token_is_valid(client):
    """Après refresh, le nouvel access_token permet d'accéder aux routes protégées."""
    await register_user(client)
    cookies = await _get_cookies(client)

    refresh_response = await client.post("/api/v1/users/refresh", cookies=cookies)
    assert refresh_response.status_code == 200

    new_cookies = dict(refresh_response.cookies)
    profile_response = await client.get("/api/v1/users/me/profile", cookies=new_cookies)
    assert profile_response.status_code == 200


# ========== ROTATION ==========


@pytest.mark.asyncio
async def test_refresh_token_rotation_invalidates_old_token(client):
    """Après refresh, l'ancien refresh_token ne doit plus fonctionner (rotation)."""
    await register_user(client)
    old_cookies = await _get_cookies(client)

    # Premier refresh : consomme l'ancien token
    response = await client.post("/api/v1/users/refresh", cookies=old_cookies)
    assert response.status_code == 200

    # Réutilisation de l'ancien token → doit échouer
    reuse_response = await client.post("/api/v1/users/refresh", cookies=old_cookies)
    assert reuse_response.status_code == 401


@pytest.mark.asyncio
async def test_new_refresh_token_works_after_rotation(client):
    """Le nouveau refresh_token retourné par /refresh doit être utilisable."""
    await register_user(client)
    cookies = await _get_cookies(client)

    first_refresh = await client.post("/api/v1/users/refresh", cookies=cookies)
    assert first_refresh.status_code == 200

    new_cookies = dict(first_refresh.cookies)
    second_refresh = await client.post("/api/v1/users/refresh", cookies=new_cookies)
    assert second_refresh.status_code == 200


# ========== EXPIRATION ==========


@pytest.mark.asyncio
async def test_expired_refresh_token_returns_401(client, db_session):
    """Un refresh_token expiré doit retourner 401."""
    await register_user(client)

    expired_token = "expired-token-xyz"
    await db_session.execute(
        insert(Token).values(
            user_id=1,
            token=expired_token,
            expires_at=datetime.now(UTC) - timedelta(days=1),
        )
    )
    await db_session.commit()

    response = await client.post(
        "/api/v1/users/refresh",
        cookies={"refresh_token": expired_token},
    )
    assert response.status_code == 401


# ========== CAS INVALIDES ==========


@pytest.mark.asyncio
async def test_refresh_with_fake_token_returns_401(client):
    """Un token inexistant doit retourner 401."""
    response = await client.post(
        "/api/v1/users/refresh",
        cookies={"refresh_token": "completely-fake-token"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_without_cookie_returns_422(client):
    """Appel sans cookie refresh_token → 422 (validation FastAPI)."""
    response = await client.post("/api/v1/users/refresh")
    assert response.status_code == 422
