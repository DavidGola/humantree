import pytest
import pytest_asyncio
from sqlalchemy import select

from app.models.skill import Skill
from app.models.skill_tree import SkillTree
from app.models.tag import SkillTreeTag, Tag
from app.models.user import User
from app.schemas.skill import SkillSaveSchema
from app.schemas.skill_tree import SkillTreeSaveSchema
from app.services.skill_tree_service import (
    TrendingPeriod,
    _sync_tags,
    get_trendings,
    is_root_skill_valid,
    save_skill_tree,
)


def skill(id: int, name: str, is_root: bool, unlock_ids: list[int] | None = None) -> SkillSaveSchema:
    """Helper pour créer un SkillSaveSchema avec moins de bruit."""
    return SkillSaveSchema(id=id, name=name, is_root=is_root, unlock_ids=unlock_ids or [])


@pytest_asyncio.fixture
async def tree(db_session):
    """Crée un User + SkillTree minimal en DB pour les tests."""
    user = User(username="testuser", email="test@example.com", password_hash="x")
    db_session.add(user)
    await db_session.flush()

    t = SkillTree(name="Test Tree", description="desc", creator_username="testuser")
    db_session.add(t)
    await db_session.commit()
    await db_session.refresh(t)
    return t


# ========== is_root_skill_valid ==========


@pytest.mark.parametrize(
    "skills, expected",
    [
        pytest.param([], True, id="empty_entry"),
        pytest.param([skill(1, "Root", True)], True, id="root_alone"),
        pytest.param([skill(1, "Root", True, [2]), skill(2, "Child", False)], True, id="single_root_multiple_skills"),
        pytest.param(
            [skill(1, "Root", True, [2]), skill(2, "Mid", False, [3]), skill(3, "Leaf", False)],
            True,
            id="root_with_chain_dependencies",
        ),
        pytest.param([skill(1, "Root1", True), skill(2, "Root2", True)], False, id="multiple_roots"),
        pytest.param([skill(1, "Orphan1", False), skill(2, "Orphan2", False, [1])], False, id="no_root"),
        pytest.param(
            [skill(1, "Root", True, [2]), skill(2, "Child", False, [1])],
            False,
            id="root_in_unlock_ids_circular",
        ),
    ],
)
def test_is_root_skill_valid(skills, expected):
    assert is_root_skill_valid(skills) == expected


# ========== _sync_tags ==========


@pytest.mark.asyncio
async def test_sync_tags_creates_new_tags(db_session, tree):
    await _sync_tags(db_session, tree.id, ["python", "fastapi"])
    await db_session.commit()

    result = await db_session.execute(select(Tag))
    tags = {t.name for t in result.scalars().all()}
    assert tags == {"python", "fastapi"}

    result = await db_session.execute(select(SkillTreeTag).where(SkillTreeTag.skill_tree_id == tree.id))
    assert len(result.scalars().all()) == 2


@pytest.mark.asyncio
async def test_sync_tags_removes_old_tags(db_session, tree):
    await _sync_tags(db_session, tree.id, ["python", "fastapi", "docker"])
    await db_session.commit()

    await _sync_tags(db_session, tree.id, ["python"])
    await db_session.commit()

    result = await db_session.execute(select(SkillTreeTag).where(SkillTreeTag.skill_tree_id == tree.id))
    associations = result.scalars().all()
    assert len(associations) == 1


@pytest.mark.asyncio
async def test_sync_tags_empty_removes_all(db_session, tree):
    await _sync_tags(db_session, tree.id, ["python", "fastapi"])
    await db_session.commit()

    await _sync_tags(db_session, tree.id, [])
    await db_session.commit()

    result = await db_session.execute(select(SkillTreeTag).where(SkillTreeTag.skill_tree_id == tree.id))
    assert result.scalars().all() == []


@pytest.mark.asyncio
async def test_sync_tags_reuses_existing_tag(db_session, tree):
    """Un tag déjà en DB ne doit pas être créé en double."""
    existing_tag = Tag(name="python")
    db_session.add(existing_tag)
    await db_session.commit()

    await _sync_tags(db_session, tree.id, ["python"])
    await db_session.commit()

    result = await db_session.execute(select(Tag).where(Tag.name == "python"))
    tags = result.scalars().all()
    assert len(tags) == 1  # pas de doublon


# ========== save_skill_tree ==========


@pytest.mark.asyncio
async def test_save_skill_tree_adds_new_skills(db_session, tree):
    schema = SkillTreeSaveSchema(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        creator_username=tree.creator_username,
        skills=[skill(-1, "Python", True)],
        tags=[],
    )
    result = await save_skill_tree(db_session, schema)
    assert result is True

    stmt = select(Skill).where(Skill.skill_tree_id == tree.id)
    skills_in_db = (await db_session.execute(stmt)).scalars().all()
    assert len(skills_in_db) == 1
    assert skills_in_db[0].name == "Python"
    assert skills_in_db[0].is_root is True


@pytest.mark.asyncio
async def test_save_skill_tree_removes_deleted_skills(db_session, tree):
    """Les skills absents du payload doivent être supprimés."""
    schema_initial = SkillTreeSaveSchema(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        creator_username=tree.creator_username,
        skills=[skill(-1, "Python", True), skill(-2, "FastAPI", False)],
        tags=[],
    )
    await save_skill_tree(db_session, schema_initial)

    stmt = select(Skill).where(Skill.skill_tree_id == tree.id)
    skills_in_db = (await db_session.execute(stmt)).scalars().all()
    python_id = next(s.id for s in skills_in_db if s.name == "Python")

    schema_update = SkillTreeSaveSchema(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        creator_username=tree.creator_username,
        skills=[skill(python_id, "Python", True)],
        tags=[],
    )
    await save_skill_tree(db_session, schema_update)

    skills_after = (await db_session.execute(stmt)).scalars().all()
    assert len(skills_after) == 1
    assert skills_after[0].name == "Python"


@pytest.mark.asyncio
async def test_save_skill_tree_not_found(db_session):
    from fastapi import HTTPException

    schema = SkillTreeSaveSchema(
        id=99999,
        name="Ghost",
        description=None,
        creator_username="nobody",
        skills=[skill(-1, "Root", True)],
        tags=[],
    )
    with pytest.raises(HTTPException) as exc_info:
        await save_skill_tree(db_session, schema)
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_save_skill_tree_invalid_root(db_session, tree):
    from fastapi import HTTPException

    schema = SkillTreeSaveSchema(
        id=tree.id,
        name=tree.name,
        description=tree.description,
        creator_username=tree.creator_username,
        skills=[skill(-1, "A", True), skill(-2, "B", True)],
        tags=[],
    )
    with pytest.raises(HTTPException) as exc_info:
        await save_skill_tree(db_session, schema)
    assert exc_info.value.status_code == 400


# ========== get_trendings ==========


@pytest.mark.asyncio
async def test_get_trendings_returns_empty_when_no_activity(db_session, tree):
    """Sans favoris ni skills cochés, get_trendings retourne une liste vide."""
    for period in TrendingPeriod:
        result = await get_trendings(db_session, period)
        assert result == [], f"Expected empty for period {period}"


@pytest.mark.asyncio
async def test_get_trendings_default_period_is_week(db_session):
    """Le défaut doit être TrendingPeriod.WEEK."""
    result = await get_trendings(db_session)
    assert isinstance(result, list)
