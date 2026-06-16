import hashlib
import time
from uuid import uuid4

import structlog
from flask import g, request

logger = structlog.get_logger()


def generate_request_id() -> str:
    return uuid4().hex[:12]


def hash_user_id(user_id: str | None) -> str | None:
    if user_id is None:
        return None
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]


def register_request_logging(app):
    @app.before_request
    def before_request():
        request_id = generate_request_id()
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)
        g.request_id = request_id
        g.start_time = time.time()

    @app.after_request
    def after_request(response):
        duration = time.time() - (g.pop('start_time', time.time()))
        user_id = hash_user_id(g.get('user_id'))
        structlog.contextvars.bind_contextvars(
            user_id=user_id,
            duration_ms=round(duration * 1000),
        )
        logger.info(
            'request',
            method=request.method,
            path=request.path,
            status=response.status_code,
        )
        return response
