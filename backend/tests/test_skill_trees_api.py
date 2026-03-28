import pytest
from tests.conftest import register_user, auth_cookies, create_skill_tree


# ========== GET ALL SKILL TREES ==========


@pytest.mark.asyncio
async def test_get_skill_trees_empty(client):
    response = await client.get("/api/v1/skill-trees/")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_skill_trees_with_data(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="Tree 1")
    await create_skill_tree(client, cookies, name="Tree 2")

    response = await client.get("/api/v1/skill-trees/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    names = [t["name"] for t in data]
    assert "Tree 1" in names
    assert "Tree 2" in names


# ========== CREATE SKILL TREE ==========


@pytest.mark.asyncio
async def test_create_skill_tree_success(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "My Tree", "description": "A great tree"},
        cookies=cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "My Tree"
    assert data["description"] == "A great tree"
    assert data["creator_username"] == "testuser"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_skill_tree_unauthenticated(client):
    response = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "My Tree"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_create_skill_tree_no_description(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "Minimal Tree"},
        cookies=cookies,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Minimal Tree"
    assert data["description"] is None


@pytest.mark.asyncio
async def test_create_skill_tree_duplicate_name(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="Unique Tree")
    response = await client.post(
        "/api/v1/skill-trees/",
        json={"name": "Unique Tree"},
        cookies=cookies,
    )
    assert response.status_code in [409, 500]


@pytest.mark.asyncio
async def test_create_skill_tree_empty_body(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.post("/api/v1/skill-trees/", json={}, cookies=cookies)
    assert response.status_code == 422


# ========== GET SKILL TREE BY ID ==========


@pytest.mark.asyncio
async def test_get_skill_tree_by_id(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.get(f"/api/v1/skill-trees/{tree['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Tree"
    assert data["skills"] == []


@pytest.mark.asyncio
async def test_get_skill_tree_not_found(client):
    response = await client.get("/api/v1/skill-trees/99999")
    assert response.status_code == 404


# ========== DELETE SKILL TREE ==========


@pytest.mark.asyncio
async def test_delete_skill_tree_success(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.delete(f"/api/v1/skill-trees/{tree['id']}", cookies=cookies)
    assert response.status_code == 204

    response = await client.get(f"/api/v1/skill-trees/{tree['id']}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_skill_tree_unauthenticated(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.delete(f"/api/v1/skill-trees/{tree['id']}")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delete_skill_tree_not_owner(client):
    await register_user(client, username="owner", email="owner@example.com")
    cookies_owner = await auth_cookies(client, username="owner")
    tree = await create_skill_tree(client, cookies_owner)

    await register_user(client, username="other", email="other@example.com")
    cookies_other = await auth_cookies(client, username="other")

    response = await client.delete(f"/api/v1/skill-trees/{tree['id']}", cookies=cookies_other)
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_skill_tree_not_found(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.delete("/api/v1/skill-trees/99999", cookies=cookies)
    assert response.status_code == 404


# ========== UPDATE SKILL TREE ==========


@pytest.mark.asyncio
async def test_update_skill_tree_success(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"name": "Updated Name", "description": "Updated desc"},
        cookies=cookies,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Name"
    assert data["description"] == "Updated desc"


@pytest.mark.asyncio
async def test_update_skill_tree_partial(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    # Mettre à jour seulement la description
    response = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"description": "New desc only"},
        cookies=cookies,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Test Tree"
    assert data["description"] == "New desc only"


@pytest.mark.asyncio
async def test_update_skill_tree_not_owner(client):
    await register_user(client, username="owner", email="owner@example.com")
    cookies_owner = await auth_cookies(client, username="owner")
    tree = await create_skill_tree(client, cookies_owner)

    await register_user(client, username="other", email="other@example.com")
    cookies_other = await auth_cookies(client, username="other")

    response = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"name": "Hacked"},
        cookies=cookies_other,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_skill_tree_unauthenticated(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.patch(
        f"/api/v1/skill-trees/{tree['id']}",
        json={"name": "Hacked"},
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_update_skill_tree_not_found(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    response = await client.patch(
        "/api/v1/skill-trees/99999",
        json={"name": "Ghost"},
        cookies=cookies,
    )
    assert response.status_code == 404


# ========== SAVE SKILL TREE (PUT) ==========


@pytest.mark.asyncio
async def test_save_skill_tree_with_skills(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.put(
        f"/api/v1/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [
                {"id": -1, "name": "Root Skill", "is_root": True, "unlock_ids": [-2]},
                {"id": -2, "name": "Child Skill", "is_root": False, "unlock_ids": []},
            ],
        },
        cookies=cookies,
    )
    assert response.status_code == 200

    # Vérifier que les skills sont sauvegardés
    detail = await client.get(f"/api/v1/skill-trees/{tree['id']}")
    assert detail.status_code == 200
    skills = detail.json()["skills"]
    assert len(skills) == 2
    names = [s["name"] for s in skills]
    assert "Root Skill" in names
    assert "Child Skill" in names


@pytest.mark.asyncio
async def test_save_skill_tree_id_mismatch(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.put(
        f"/api/v1/skill-trees/save/{tree['id']}",
        json={
            "id": 99999,
            "name": "Test Tree",
            "creator_username": "testuser",
            "skills": [],
        },
        cookies=cookies,
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_save_skill_tree_not_owner(client):
    await register_user(client, username="owner", email="owner@example.com")
    cookies_owner = await auth_cookies(client, username="owner")
    tree = await create_skill_tree(client, cookies_owner)

    await register_user(client, username="other", email="other@example.com")
    cookies_other = await auth_cookies(client, username="other")

    response = await client.put(
        f"/api/v1/skill-trees/save/{tree['id']}",
        json={
            "id": tree["id"],
            "name": "Test Tree",
            "creator_username": "owner",
            "skills": [],
        },
        cookies=cookies_other,
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_save_skill_tree_unauthenticated(client):
    response = await client.put(
        "/api/v1/skill-trees/save/1",
        json={"id": 1, "name": "X", "creator_username": "x", "skills": []},
    )
    assert response.status_code == 401


# ========== SAVE WITH LINKED TREE ==========


@pytest.mark.asyncio
async def test_save_skill_tree_with_linked_tree(client):
    """Un skill peut pointer vers un autre arbre via linked_tree_id."""
    await register_user(client)
    cookies = await auth_cookies(client)
    parent = await create_skill_tree(client, cookies, name="Parent")
    child = await create_skill_tree(client, cookies, name="Child")

    response = await client.put(
        f"/api/v1/skill-trees/save/{parent['id']}",
        json={
            "id": parent["id"],
            "name": "Parent",
            "creator_username": "testuser",
            "skills": [
                {
                    "id": -1,
                    "name": "Root",
                    "is_root": True,
                    "unlock_ids": [-2],
                },
                {
                    "id": -2,
                    "name": "Child",
                    "is_root": False,
                    "unlock_ids": [],
                    "linked_tree_id": child["id"],
                },
            ],
        },
        cookies=cookies,
    )
    assert response.status_code == 200

    detail = await client.get(f"/api/v1/skill-trees/{parent['id']}")
    skills = detail.json()["skills"]
    linked_skill = next(s for s in skills if s["name"] == "Child")
    assert linked_skill["linked_tree_id"] == child["id"]


@pytest.mark.asyncio
async def test_delete_linked_tree_nullifies_skill(client):
    """Supprimer un arbre lié met linked_tree_id à NULL (ondelete SET NULL)."""
    await register_user(client)
    cookies = await auth_cookies(client)
    parent = await create_skill_tree(client, cookies, name="Parent")
    child = await create_skill_tree(client, cookies, name="Child")

    # Sauvegarder parent avec un skill lié à child
    await client.put(
        f"/api/v1/skill-trees/save/{parent['id']}",
        json={
            "id": parent["id"],
            "name": "Parent",
            "creator_username": "testuser",
            "skills": [
                {
                    "id": -1,
                    "name": "Linked Skill",
                    "is_root": True,
                    "unlock_ids": [],
                    "linked_tree_id": child["id"],
                },
            ],
        },
        cookies=cookies,
    )

    # Supprimer l'arbre child
    response = await client.delete(
        f"/api/v1/skill-trees/{child['id']}", cookies=cookies
    )
    assert response.status_code == 204

    # Vérifier que le skill parent a linked_tree_id = null
    detail = await client.get(f"/api/v1/skill-trees/{parent['id']}")
    skills = detail.json()["skills"]
    assert len(skills) == 1
    assert skills[0]["linked_tree_id"] is None


@pytest.mark.asyncio
async def test_save_does_not_copy_linked_tree(client):
    """Le save ne crée plus de copie — linked_tree_id reste l'original."""
    await register_user(client)
    cookies = await auth_cookies(client)
    parent = await create_skill_tree(client, cookies, name="Parent")
    other = await create_skill_tree(client, cookies, name="Other")

    await client.put(
        f"/api/v1/skill-trees/save/{parent['id']}",
        json={
            "id": parent["id"],
            "name": "Parent",
            "creator_username": "testuser",
            "skills": [
                {
                    "id": -1,
                    "name": "Link",
                    "is_root": True,
                    "unlock_ids": [],
                    "linked_tree_id": other["id"],
                },
            ],
        },
        cookies=cookies,
    )

    detail = await client.get(f"/api/v1/skill-trees/{parent['id']}")
    skills = detail.json()["skills"]
    # linked_tree_id doit pointer vers l'original, pas une copie
    assert skills[0]["linked_tree_id"] == other["id"]

    # Vérifier qu'aucun autre arbre n'a été créé
    all_trees = await client.get("/api/v1/skill-trees/")
    assert len(all_trees.json()) == 2


# ========== GET SKILL TREES BY USERNAME ==========


@pytest.mark.asyncio
async def test_get_skill_trees_by_username(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="Tree A")
    await create_skill_tree(client, cookies, name="Tree B")

    response = await client.get("/api/v1/skill-trees/skill-trees-user?username=testuser")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_get_skill_trees_by_username_empty(client):
    response = await client.get("/api/v1/skill-trees/skill-trees-user?username=nobody")
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_get_skill_trees_by_username_isolation(client):
    """Vérifie qu'un user ne voit que ses propres arbres."""
    await register_user(client, username="alice", email="alice@example.com")
    cookies_alice = await auth_cookies(client, username="alice")
    await create_skill_tree(client, cookies_alice, name="Alice Tree")

    await register_user(client, username="bob", email="bob@example.com")
    cookies_bob = await auth_cookies(client, username="bob")
    await create_skill_tree(client, cookies_bob, name="Bob Tree")

    response = await client.get("/api/v1/skill-trees/skill-trees-user?username=alice")
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "Alice Tree"


# ========== MY SKILL TREES (auth) ==========


@pytest.mark.asyncio
async def test_my_skill_trees(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    await create_skill_tree(client, cookies, name="My Tree")

    response = await client.get("/api/v1/skill-trees/my-skill-trees", cookies=cookies)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["name"] == "My Tree"


@pytest.mark.asyncio
async def test_my_skill_trees_unauthenticated(client):
    response = await client.get("/api/v1/skill-trees/my-skill-trees")
    assert response.status_code == 401


# ========== FAVORITES ==========


@pytest.mark.asyncio
async def test_add_and_get_favorite(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    response = await client.post(
        f"/api/v1/skill-trees/favorite/{tree['id']}", cookies=cookies
    )
    assert response.status_code == 200

    response = await client.get(
        "/api/v1/skill-trees/my-favorite-skill-trees", cookies=cookies
    )
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["id"] == tree["id"]


@pytest.mark.asyncio
async def test_remove_favorite(client):
    await register_user(client)
    cookies = await auth_cookies(client)
    tree = await create_skill_tree(client, cookies)

    await client.post(f"/api/v1/skill-trees/favorite/{tree['id']}", cookies=cookies)

    response = await client.delete(
        f"/api/v1/skill-trees/favorite/{tree['id']}", cookies=cookies
    )
    assert response.status_code == 200

    response = await client.get(
        "/api/v1/skill-trees/my-favorite-skill-trees", cookies=cookies
    )
    assert response.status_code == 200
    assert response.json() == []


@pytest.mark.asyncio
async def test_favorite_unauthenticated(client):
    response = await client.post("/api/v1/skill-trees/favorite/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_remove_favorite_unauthenticated(client):
    response = await client.delete("/api/v1/skill-trees/favorite/1")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_my_favorites_unauthenticated(client):
    response = await client.get("/api/v1/skill-trees/my-favorite-skill-trees")
    assert response.status_code == 401


# ========== TRENDINGS ==========


@pytest.mark.asyncio
async def test_trendings_empty(client):
    response = await client.get("/api/v1/skill-trees/trendings")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_trendings_with_param(client):
    response = await client.get("/api/v1/skill-trees/trendings?timestamp=d")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_trendings_monthly(client):
    response = await client.get("/api/v1/skill-trees/trendings?timestamp=m")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


# ========== HEALTH CHECK ==========


@pytest.mark.asyncio
async def test_health_check(client):
    response = await client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "checks" in data
    assert data["checks"]["database"]["status"] == "ok"
    assert "latency_ms" in data["checks"]["database"]
    assert "db_pool" in data["checks"]
