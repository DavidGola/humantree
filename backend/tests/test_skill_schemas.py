import pytest
from pydantic import ValidationError
from app.schemas.skill import SkillSchema, SkillCreateSchema, SkillSaveSchema


# --- SkillSchema.extract_unlock_ids validator ---


class FakeSkill:
    """Simule un objet ORM Skill avec un attribut .id"""

    def __init__(self, id: int):
        self.id = id


def test_extract_unlock_ids_from_orm_objects():
    data = {
        "id": 1,
        "name": "Python",
        "is_root": True,
        "unlocks": [FakeSkill(2), FakeSkill(3)],
    }
    skill = SkillSchema.model_validate(data)
    assert skill.unlock_ids == [2, 3]


def test_extract_unlock_ids_empty_list():
    data = {
        "id": 1,
        "name": "Python",
        "is_root": True,
        "unlocks": [],
    }
    skill = SkillSchema.model_validate(data)
    assert skill.unlock_ids == []


def test_extract_unlock_ids_none():
    data = {
        "id": 1,
        "name": "Python",
        "is_root": True,
        "unlocks": None,
    }
    skill = SkillSchema.model_validate(data)
    assert skill.unlock_ids == []


# --- SkillCreateSchema name validation ---


@pytest.mark.parametrize(
    "name",
    [
        pytest.param("A", id="min_length_1"),
        pytest.param("Python Basics", id="normal_name"),
        pytest.param("A" * 100, id="max_length_100"),
    ],
)
def test_skill_create_valid_name(name):
    skill = SkillCreateSchema(name=name, skill_tree_id=1)
    assert skill.name == name


@pytest.mark.parametrize(
    "name",
    [
        pytest.param("", id="empty_string"),
        pytest.param("A" * 101, id="too_long_101_chars"),
    ],
)
def test_skill_create_invalid_name(name):
    with pytest.raises(ValidationError):
        SkillCreateSchema(name=name, skill_tree_id=1)


# --- SkillSaveSchema name validation ---


def test_skill_save_valid():
    skill = SkillSaveSchema(id=1, name="Python", is_root=True, unlock_ids=[2])
    assert skill.name == "Python"
    assert skill.unlock_ids == [2]


def test_skill_save_invalid_empty_name():
    with pytest.raises(ValidationError):
        SkillSaveSchema(id=1, name="", is_root=True, unlock_ids=[])
