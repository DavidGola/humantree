import pytest
from app.services.skill_tree_service import is_root_skill_valid
from app.schemas.skill import SkillSaveSchema


def skill(id: int, name: str, is_root: bool, unlock_ids: list[int] = []) -> SkillSaveSchema:
    """Helper pour créer un SkillSaveSchema avec moins de bruit."""
    return SkillSaveSchema(id=id, name=name, is_root=is_root, unlock_ids=unlock_ids)


@pytest.mark.parametrize(
    "skills, expected",
    [
        pytest.param(
            [],
            True,
            id="empty_entry",
        ),
        pytest.param(
            [skill(1, "Root", True)],
            True,
            id="root_alone",
        ),
        pytest.param(
            [skill(1, "Root", True, [2]), skill(2, "Child", False)],
            True,
            id="single_root_multiple_skills",
        ),
        pytest.param(
            [skill(1, "Root", True, [2]), skill(2, "Mid", False, [3]), skill(3, "Leaf", False)],
            True,
            id="root_with_chain_dependencies",
        ),
        pytest.param(
            [skill(1, "Root1", True), skill(2, "Root2", True)],
            False,
            id="multiple_roots",
        ),
        pytest.param(
            [skill(1, "Orphan1", False), skill(2, "Orphan2", False, [1])],
            False,
            id="no_root",
        ),
        pytest.param(
            [skill(1, "Root", True, [2]), skill(2, "Child", False, [1])],
            False,
            id="root_in_unlock_ids_circular",
        ),
    ],
)
def test_is_root_skill_valid(skills, expected):
    assert is_root_skill_valid(skills) == expected
