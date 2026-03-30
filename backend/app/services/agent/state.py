from dataclasses import dataclass, field
from enum import StrEnum

from app.constants import AGENT_MAX_ATTEMPTS, AGENT_QUALITY_THRESHOLD, AGENT_TIMEOUT_BUDGET


class AgentPhase(StrEnum):
    GENERATE = "generate"
    EVALUATE = "evaluate"
    IMPROVE = "improve"
    DONE = "done"


@dataclass
class QualityScore:
    overall: float
    structure: float
    pedagogy: float
    completeness: float
    feedback: str


@dataclass
class AgentStep:
    phase: str
    provider: str
    duration_seconds: float
    success: bool
    input_tokens: int = 0
    output_tokens: int = 0


@dataclass
class AgentMetadata:
    provider_used: str
    fallback_used: bool
    fallback_provider: str | None
    quality_score: QualityScore | None
    attempts: int
    total_input_tokens: int
    total_output_tokens: int
    agent_duration_seconds: float
    steps: list[AgentStep] = field(default_factory=list)


@dataclass
class AgentResult:
    tree_data: dict
    metadata: AgentMetadata


@dataclass
class AgentConfig:
    quality_threshold: float = AGENT_QUALITY_THRESHOLD
    max_attempts: int = AGENT_MAX_ATTEMPTS
    timeout_budget: float = AGENT_TIMEOUT_BUDGET


@dataclass
class AgentState:
    phase: AgentPhase = AgentPhase.GENERATE
    tree_data: dict | None = None
    quality: QualityScore | None = None
    attempts: int = 0
    provider_used: str = ""
    providers_tried: list[str] = field(default_factory=list)
    fallback_used: bool = False
    fallback_provider: str | None = None
    total_input_tokens: int = 0
    total_output_tokens: int = 0
    steps: list[AgentStep] = field(default_factory=list)
    best_tree: dict | None = None
    best_quality: QualityScore | None = None
