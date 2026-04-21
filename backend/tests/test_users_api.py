import asyncio

import pytest

from tests.conftest import auth_cookies, create_skill_tree, register_user

# ========== REGISTER ==========


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "alice", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert data["email"] == "alice@example.com"
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    await register_user(client, username="alice", email="alice@example.com")
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "bob", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    await register_user(client, username="alice", email="alice@example.com")
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "alice", "email": "bob@example.com", "password": "password123"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "alice", "email": "not-an-email", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_too_short(client):
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "alice", "email": "alice@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_username_too_short(client):
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "ab", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_username_invalid_chars(client):
    response = await client.post(
        "/api/v1/users/register",
        json={"username": "user name", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_empty_body(client):
    response = await client.post("/api/v1/users/register", json={})
    assert response.status_code == 422


# ========== LOGIN ==========


@pytest.mark.asyncio
async def test_login_success(client):
    await register_user(client)
    response = await client.post(
        "/api/v1/users/login",
        data={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_with_email(client):
    await register_user(client)
    response = await client.post(
        "/api/v1/users/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await register_user(client)
    response = await client.post(
        "/api/v1/users/login",
        data={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    response = await client.post(
        "/api/v1/users/login",
        data={"username": "nobody", "password": "password123"},
    )
    assert response.status_code == 401


# ========== REFRESH TOKEN ==========


@pytest.mark.asyncio
async def test_refresh_token_success(client):
    await register_user(client)
    login_response = await client.post(
        "/api/v1/users/login",
        data={"username": "testuser", "password": "password123"},
    )
    client.cookies.set("refresh_token", login_response.cookies["refresh_token"])
    response = await client.post("/api/v1/users/refresh")
    assert response.status_code == 200
    assert "access_token" in response.cookies


@pytest.mark.asyncio
async def test_refresh_token_invalid(client):
    client.cookies.set("refresh_token", "invalid_token")
    response = await client.post("/api/v1/users/refresh")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_missing(client):
    response = await client.post("/api/v1/users/refresh")
    assert response.status_code == 422


# ========== GET PUBLIC USER ==========


@pytest.mark.asyncio
async def test_get_public_user(client):
    await register_user(client, username="alice", email="alice@example.com")
    response = await client.get("/api/v1/users/alice")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert "email" not in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_get_public_user_not_found(client):
    response = await client.get("/api/v1/users/nobody")
    assert response.status_code == 404


# ========== SKILLS CHECKED ==========


@pytest.mark.asyncio
async def test_skills_checked_empty(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.get("/api/v1/users/skills-checked", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert data["skill_ids"] == []


@pytest.mark.asyncio
async def test_skills_checked_unauthenticated(client):
    response = await client.get("/api/v1/users/skills-checked")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_add_and_get_skill_checked(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    # Créer un skill tree avec un skill pour avoir un skill_id valide
    tree = await create_skill_tree(client, cookies, name="Test Tree")
    # Sauvegarder avec un skill
    await client.put(
        f"/api/v1/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [
                {"id": -1, "name": "Skill A", "is_root": True, "unlock_ids": []},
            ],
        },
        cookies=cookies,
    )
    # Récupérer le skill_id créé
    detail = await client.get(f"/api/v1/skill-trees/{tree['id']}")
    skill_id = detail.json()["skills"][0]["id"]

    # Ajouter le skill comme checked
    response = await client.post(
        "/api/v1/users/skills-checked",
        json={"skill_id": skill_id},
        cookies=cookies,
    )
    assert response.status_code == 204

    # Vérifier qu'il est dans la liste
    response = await client.get("/api/v1/users/skills-checked", cookies=cookies)
    assert response.status_code == 200
    assert skill_id in response.json()["skill_ids"]


@pytest.mark.asyncio
async def test_remove_skill_checked(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies, name="Test Tree")
    await client.put(
        f"/api/v1/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [
                {"id": -1, "name": "Skill A", "is_root": True, "unlock_ids": []},
            ],
        },
        cookies=cookies,
    )
    detail = await client.get(f"/api/v1/skill-trees/{tree['id']}")
    skill_id = detail.json()["skills"][0]["id"]

    # Ajouter puis supprimer
    await client.post(
        "/api/v1/users/skills-checked",
        json={"skill_id": skill_id},
        cookies=cookies,
    )
    response = await client.delete(f"/api/v1/users/skills-checked/{skill_id}", cookies=cookies)
    assert response.status_code == 204

    # Vérifier que la liste est vide
    response = await client.get("/api/v1/users/skills-checked", cookies=cookies)
    assert response.status_code == 200
    assert skill_id not in response.json()["skill_ids"]


@pytest.mark.asyncio
async def test_add_skill_checked_unauthenticated(client):
    response = await client.post("/api/v1/users/skills-checked", json={"skill_id": 1})
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_remove_skill_checked_unauthenticated(client):
    response = await client.delete("/api/v1/users/skills-checked/1")
    assert response.status_code == 401


# ========== PROTECTED ROUTES WITH INVALID TOKEN ==========


@pytest.mark.asyncio
async def test_invalid_token(client):
    cookies = {"access_token": "invalid.token.here"}
    response = await client.get("/api/v1/users/skills-checked", cookies=cookies)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_profile_unauthenticated(client):
    response = await client.get("/api/v1/users/me/profile")
    assert response.status_code in [401, 404]


# ========== CONCURRENCE ==========


@pytest.mark.asyncio
async def test_concurrent_register_same_email_returns_409(client):
    """Deux inscriptions simultanées avec le même email : une seule réussit, l'autre → 409."""
    payload = {"username": "alice", "email": "alice@example.com", "password": "password123"}
    payload_b = {"username": "bob", "email": "alice@example.com", "password": "password123"}

    responses = await asyncio.gather(
        client.post("/api/v1/users/register", json=payload),
        client.post("/api/v1/users/register", json=payload_b),
    )

    status_codes = sorted(r.status_code for r in responses)
    assert status_codes == [200, 409], f"Expected [200, 409], got {status_codes}"


@pytest.mark.asyncio
async def test_concurrent_register_same_username_returns_409(client):
    """Deux inscriptions simultanées avec le même username : une seule réussit, l'autre → 409."""
    payload_a = {"username": "alice", "email": "alice@example.com", "password": "password123"}
    payload_b = {"username": "alice", "email": "bob@example.com", "password": "password123"}

    responses = await asyncio.gather(
        client.post("/api/v1/users/register", json=payload_a),
        client.post("/api/v1/users/register", json=payload_b),
    )

    status_codes = sorted(r.status_code for r in responses)
    assert status_codes == [200, 409], f"Expected [200, 409], got {status_codes}"


# ========== UPDATE USER PROFILE ==========


@pytest.mark.asyncio
async def test_update_username_already_taken_returns_409(client):
    await register_user(client, username="alice", email="alice@example.com")
    await register_user(client, username="bob", email="bob@example.com")
    cookies = await auth_cookies(client, username="bob")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"username": "alice"},
        cookies=cookies,
    )
    assert response.status_code == 409
    assert "username" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_email_already_registered_returns_409(client):
    await register_user(client, username="alice", email="alice@example.com")
    await register_user(client, username="bob", email="bob@example.com")
    cookies = await auth_cookies(client, username="bob")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"email": "alice@example.com"},
        cookies=cookies,
    )
    assert response.status_code == 409
    assert "email" in response.json()["detail"].lower()


@pytest.mark.asyncio
async def test_update_own_username_same_value_ok(client):
    await register_user(client, username="alice", email="alice@example.com")
    cookies = await auth_cookies(client, username="alice")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"username": "alice"},
        cookies=cookies,
    )
    assert response.status_code == 200
    assert response.json()["username"] == "alice"


@pytest.mark.asyncio
async def test_update_own_email_same_value_ok(client):
    await register_user(client, username="alice", email="alice@example.com")
    cookies = await auth_cookies(client, username="alice")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"email": "alice@example.com"},
        cookies=cookies,
    )
    assert response.status_code == 200
    assert response.json()["email"] == "alice@example.com"


@pytest.mark.asyncio
async def test_update_bio_success(client):
    await register_user(client, username="alice", email="alice@example.com")
    cookies = await auth_cookies(client, username="alice")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"bio": "Hello, I am Alice"},
        cookies=cookies,
    )
    assert response.status_code == 200
    assert response.json()["bio"] == "Hello, I am Alice"


@pytest.mark.asyncio
async def test_update_password_success(client):
    await register_user(client, username="alice", email="alice@example.com")
    cookies = await auth_cookies(client, username="alice")
    response = await client.patch(
        "/api/v1/users/me/profile",
        json={"password": "newpassword456"},
        cookies=cookies,
    )
    assert response.status_code == 200

    login_response = await client.post(
        "/api/v1/users/login",
        data={"username": "alice", "password": "newpassword456"},
    )
    assert login_response.status_code == 200


# ========== CONCURRENT UPDATE ==========


@pytest.mark.asyncio
async def test_concurrent_update_same_email_returns_409(client):
    await register_user(client, username="alice", email="alice@example.com")
    await register_user(client, username="bob", email="bob@example.com")
    await register_user(client, username="charlie", email="charlie@example.com")
    cookies_bob = await auth_cookies(client, username="bob")
    cookies_charlie = await auth_cookies(client, username="charlie")

    responses = await asyncio.gather(
        client.patch("/api/v1/users/me/profile", json={"email": "new@example.com"}, cookies=cookies_bob),
        client.patch("/api/v1/users/me/profile", json={"email": "new@example.com"}, cookies=cookies_charlie),
    )

    status_codes = sorted(r.status_code for r in responses)
    assert status_codes == [200, 409], f"Expected [200, 409], got {status_codes}"


@pytest.mark.asyncio
async def test_concurrent_update_same_username_returns_409(client):
    await register_user(client, username="alice", email="alice@example.com")
    await register_user(client, username="bob", email="bob@example.com")
    await register_user(client, username="charlie", email="charlie@example.com")
    cookies_bob = await auth_cookies(client, username="bob")
    cookies_charlie = await auth_cookies(client, username="charlie")

    responses = await asyncio.gather(
        client.patch("/api/v1/users/me/profile", json={"username": "newuser"}, cookies=cookies_bob),
        client.patch("/api/v1/users/me/profile", json={"username": "newuser"}, cookies=cookies_charlie),
    )

    status_codes = sorted(r.status_code for r in responses)
    assert status_codes == [200, 409], f"Expected [200, 409], got {status_codes}"
