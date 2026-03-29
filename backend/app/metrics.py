from prometheus_client import Counter, Gauge, Histogram
from prometheus_fastapi_instrumentator import Instrumentator

instrumentator = Instrumentator(
    should_group_status_codes=False,
    should_ignore_untemplated=True,
    excluded_handlers=["/health", "/metrics"],
)

counter_rate_limit_exceeded = Counter(
    "rate_limit_exceeded_total",
    "Total number of times the rate limit was exceeded",
    ["method", "path"],
)

db_pool_checked_out = Gauge(
    "db_pool_checked_out",
    "Number of connections currently checked out from the database pool",
)

# --- AI / LLM metrics ---

llm_requests_total = Counter(
    "llm_requests_total",
    "Total LLM API calls",
    ["provider", "model", "endpoint", "status"],
)

llm_tokens_total = Counter(
    "llm_tokens_total",
    "Total tokens consumed by LLM calls",
    ["provider", "model", "endpoint", "direction"],
)

llm_request_duration_seconds = Histogram(
    "llm_request_duration_seconds",
    "LLM API call duration in seconds",
    ["provider", "model", "endpoint"],
    buckets=(0.5, 1.0, 2.0, 3.0, 5.0, 10.0, 15.0, 30.0, 60.0),
)

llm_estimated_cost_dollars = Counter(
    "llm_estimated_cost_dollars_total",
    "Estimated cost of LLM calls in USD",
    ["provider", "model", "endpoint"],
)
