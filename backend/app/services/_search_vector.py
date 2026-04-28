from sqlalchemy import func, literal_column
from sqlalchemy.orm import selectinload

from app.models.skill import Skill
from app.models.skill_tree import SkillTree


def concat_skills_text(skills) -> str:
    return " ".join(f"{s.name} {s.description}" if s.description else s.name for s in skills)


def build_search_vector(tree: SkillTree, skills_text: str = ""):
    expr = func.setweight(
        func.to_tsvector("french", func.unaccent(func.coalesce(tree.name, ""))),
        literal_column("'A'"),
    ).op("||")(
        func.setweight(
            func.to_tsvector("french", func.unaccent(func.coalesce(tree.description, ""))),
            literal_column("'B'"),
        )
    )
    if skills_text:
        expr = expr.op("||")(
            func.setweight(
                func.to_tsvector("french", func.unaccent(skills_text)),
                literal_column("'C'"),
            )
        )
    return expr


EAGER_LOAD_TREE = selectinload(SkillTree.skills).selectinload(Skill.unlocks), selectinload(SkillTree.tags)
EAGER_LOAD_TREE_TAGS = selectinload(SkillTree.tags)
