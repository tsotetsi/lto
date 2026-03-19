import logging
import os

import logging_loki
import structlog


def setup_logging():
    # Basic stdlib config (for non-structlog logs).
    logging.basicConfig(
        level=logging.INFO, handlers=[logging.StreamHandler()], format="%(message)s"
    )

    # Loki handler.
    loki_url = os.environ["GRAFANA_LOKI_URL"]
    if not loki_url.endswith("/loki/api/v1/push"):
        loki_url = loki_url.rstrip("/") + "/loki/api/v1/push"

    # Only provide auth if keys actually exist.
    loki_user = os.getenv("GRAFANA_LOKI_USERNAME", None)
    loki_pw = os.getenv("GRAFANA_LOKI_API_KEY", None)
    auth = (loki_user, loki_pw) if loki_user and loki_pw else None

    loki_handler = logging_loki.LokiHandler(
        url=loki_url,
        auth=auth,
        tags={
            "app": "lto-apis",
            "env": os.getenv("ENVIRONMENT", "local"),  # Default to dev locally.
            "service": "lto-apis",
        },
        version="1",
    )

    # LTO-API logger.
    lto_api_logger = logging.getLogger("lto-api")
    lto_api_logger.setLevel(logging.INFO)
    lto_api_logger.addHandler(loki_handler)
    lto_api_logger.propagate = False

    # Structlog config.
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.stdlib.render_to_log_kwargs,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )
    return lto_api_logger