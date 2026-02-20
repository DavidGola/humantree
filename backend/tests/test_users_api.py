import pytest
from tests.conftest import register_user, login_user, auth_headers, create_skill_tree


# ========== REGISTER ==========


@pytest.mark.asyncio
async def test_register_success(client):
    response = await client.post(
        "/users/register",
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
        "/users/register",
        json={"username": "bob", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    await register_user(client, username="alice", email="alice@example.com")
    response = await client.post(
        "/users/register",
        json={"username": "alice", "email": "bob@example.com", "password": "password123"},
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_register_invalid_email(client):
    response = await client.post(
        "/users/register",
        json={"username": "alice", "email": "not-an-email", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_password_too_short(client):
    response = await client.post(
        "/users/register",
        json={"username": "alice", "email": "alice@example.com", "password": "short"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_username_too_short(client):
    response = await client.post(
        "/users/register",
        json={"username": "ab", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_username_invalid_chars(client):
    response = await client.post(
        "/users/register",
        json={"username": "user name", "email": "alice@example.com", "password": "password123"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_empty_body(client):
    response = await client.post("/users/register", json={})
    assert response.status_code == 422


# ========== LOGIN ==========


@pytest.mark.asyncio
async def test_login_success(client):
    await register_user(client)
    response = await client.post(
        "/users/login",
        data={"username": "testuser", "password": "password123"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["username"] == "testuser"
    assert "expires_in" in data


@pytest.mark.asyncio
async def test_login_with_email(client):
    await register_user(client)
    response = await client.post(
        "/users/login",
        data={"username": "test@example.com", "password": "password123"},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    await register_user(client)
    response = await client.post(
        "/users/login",
        data={"username": "testuser", "password": "wrongpassword"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_nonexistent_user(client):
    response = await client.post(
        "/users/login",
        data={"username": "nobody", "password": "password123"},
    )
    assert response.status_code == 401


# ========== REFRESH TOKEN ==========


@pytest.mark.asyncio
async def test_refresh_token_success(client):
    await register_user(client)
    login_response = await client.post(
        "/users/login",
        data={"username": "testuser", "password": "password123"},
    )
    client.cookies.set("refresh_token", login_response.cookies["refresh_token"])
    response = await client.post("/users/refresh")
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_refresh_token_invalid(client):
    client.cookies.set("refresh_token", "invalid_token")
    response = await client.post("/users/refresh")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_refresh_token_missing(client):
    response = await client.post("/users/refresh")
    assert response.status_code == 422


# ========== GET PUBLIC USER ==========


@pytest.mark.asyncio
async def test_get_public_user(client):
    await register_user(client, username="alice", email="alice@example.com")
    response = await client.get("/users/alice")
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    assert "email" not in data
    assert "password" not in data


@pytest.mark.asyncio
async def test_get_public_user_not_found(client):
    response = await client.get("/users/nobody")
    assert response.status_code == 404


# ========== SKILLS CHECKED ==========


@pytest.mark.asyncio
async def test_skills_checked_empty(client):
    await register_user(client)
    headers = await auth_headers(client)
    response = await client.get("/users/skills-checked", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["skill_ids"] == []


@pytest.mark.asyncio
async def test_skills_checked_unauthenticated(client):
    response = await client.get("/users/skills-checked")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_add_and_get_skill_checked(client):
    await register_user(client)
    headers = await auth_headers(client)
    # Créer un skill tree avec un skill pour avoir un skill_id valide
    tree = await create_skill_tree(client, headers, name="Test Tree")
    # Sauvegarder avec un skill
    await client.put(
        f"/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [
                {"id": -1, "name": "Skill A", "is_root": True, "unlock_ids": []},
            ],
        },
        headers=headers,
    )
    # Récupérer le skill_id créé
    detail = await client.get(f"/skill-trees/{tree['id']}")
    skill_id = detail.json()["skills"][0]["id"]

    # Ajouter le skill comme checked
    response = await client.post(
        "/users/skills-checked",
        json={"skill_id": skill_id},
        headers=headers,
    )
    assert response.status_code == 204

    # Vérifier qu'il est dans la liste
    response = await client.get("/users/skills-checked", headers=headers)
    assert response.status_code == 200
    assert skill_id in response.json()["skill_ids"]


@pytest.mark.asyncio
async def test_remove_skill_checked(client):
    await register_user(client)
    headers = await auth_headers(client)
    tree = await create_skill_tree(client, headers, name="Test Tree")
    await client.put(
        f"/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [
                {"id": -1, "name": "Skill A", "is_root": True, "unlock_ids": []},
            ],
        },
        headers=headers,
    )
    detail = await client.get(f"/skill-trees/{tree['id']}")
    skill_id = detail.json()["skills"][0]["id"]

    # Ajouter puis supprimer
    await client.post(
        "/users/skills-checked",
        json={"skill_id": skill_id},
        headers=headers,
    )
    response = await client.delete(
        f"/users/skills-checked/{skill_id}", headers=headers
    )
    assert response.status_code == 204

    # Vérifier que la liste est vide
    response = await client.get("/users/skills-checked", headers=headers)
    assert response.status_code == 200
    assert skill_id not in response.json()["skill_ids"]


@pytest.mark.asyncio
async def test_add_skill_checked_unauthenticated(client):
    response = await client.post(
        "/users/skills-checked", json={"skill_id": 1}
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_remove_skill_checked_unauthenticated(client):
    response = await client.delete("/users/skills-checked/1")
    assert response.status_code == 401


# ========== PROTECTED ROUTES WITH INVALID TOKEN ==========


@pytest.mark.asyncio
async def test_invalid_token(client):
    headers = {"Authorization": "Bearer invalid.token.here"}
    response = await client.get("/users/skills-checked", headers=headers)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_profile_unauthenticated(client):
    response = await client.get("/users/me/profile")
    assert response.status_code in [401, 404]
