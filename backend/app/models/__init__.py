# noqa: F401 - imports needed for SQLAlchemy metadata
from app.models.skill import Skill  # noqa: F401
from app.models.skill_dependencies import SkillDependency  # noqa: F401
from app.models.skill_tree import SkillTree  # noqa: F401
from app.models.tag import SkillTreeTag, Tag  # noqa: F401
from app.models.tokens import Token  # noqa: F401
from app.models.user import User  # noqa: F401
from app.models.user_api_key import UserApiKey  # noqa: F401
from app.models.user_check_skill import UserCheckSkill  # noqa: F401
from app.models.user_favorite_trees import UserFavoriteTrees  # noqa: F401
