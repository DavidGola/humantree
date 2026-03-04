"""Tests pour la gestion d'erreurs backend : handler global, favoris, validation Pydantic."""

import pytest
from tests.conftest import register_user, auth_cookies, create_skill_tree


# ========== HANDLER GLOBAL IntegrityError ==========


@pytest.mark.asyncio
async def test_duplicate_favorite_returns_409(client):
    """Ajouter un favori en doublon doit retourner 409."""
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    # Premier ajout : OK
    resp = await client.post(f"/api/v1/skill-trees/favorite/{tree['id']}", cookies=cookies)
    assert resp.status_code == 200

    # Doublon : 409
    resp = await client.post(f"/api/v1/skill-trees/favorite/{tree['id']}", cookies=cookies)
    assert resp.status_code == 409
    assert "favoris" in resp.json()["detail"].lower() or "déjà" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_favorite_nonexistent_tree_returns_400(client):
    """Ajouter en favori un arbre inexistant doit retourner 400."""
    await register_user(client)
    cookies = await auth_cookies(client)

    resp = await client.post("/api/v1/skill-trees/favorite/999999", cookies=cookies)
    assert resp.status_code == 400
    assert "introuvable" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_remove_nonexistent_favorite_returns_404(client):
    """Supprimer un favori inexistant doit retourner 404."""
    await register_user(client)
    cookies = await auth_cookies(client)

    resp = await client.delete("/api/v1/skill-trees/favorite/999999", cookies=cookies)
    assert resp.status_code == 404


# ========== VALIDATION PYDANTIC ==========


@pytest.mark.asyncio
async def test_create_skill_tree_empty_name_returns_422(client):
    """Créer un arbre avec un nom vide doit retourner 422."""
    await register_user(client)
    cookies = await auth_cookies(client)

    resp = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "", "description": "test"},
        cookies=cookies,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_create_skill_tree_name_too_long_returns_422(client):
    """Créer un arbre avec un nom trop long doit retourner 422."""
    await register_user(client)
    cookies = await auth_cookies(client)

    resp = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "x" * 101, "description": "test"},
        cookies=cookies,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_skill_tree_empty_name_returns_422(client):
    """Mettre à jour un arbre avec un nom vide doit retourner 422."""
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    resp = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"name": ""},
        cookies=cookies,
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_update_skill_tree_name_too_long_returns_422(client):
    """Mettre à jour un arbre avec un nom trop long doit retourner 422."""
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    resp = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"name": "x" * 101},
        cookies=cookies,
    )
    assert resp.status_code == 422


# ========== DUPLICATE SKILL TREE NAME ==========


@pytest.mark.asyncio
async def test_create_duplicate_skill_tree_name_returns_409(client):
    """Créer un arbre avec un nom déjà existant doit retourner 409."""
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="Unique Name")

    resp = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "Unique Name"},
        cookies=cookies,
    )
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_update_skill_tree_to_duplicate_name_returns_409(client):
    """Renommer un arbre vers un nom déjà pris doit retourner 409."""
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="Name A")
    tree_b = await create_skill_tree(client, cookies, name="Name B")

    resp = await client.patch(
        f"/api/v1/skill-trees/{tree_b['id']}",
        json={"name": "Name A"},
        cookies=cookies,
    )
    assert resp.status_code == 409
