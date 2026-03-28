from prometheus_client import Counter, Gauge
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
