import time
from collections import defaultdict

import structlog
from flask import g, request
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

logger = structlog.get_logger()


def get_user_id():
    return g.get('user_id', 'anonymous')


def get_ip():
    return get_remote_address()


limiter = Limiter(
    key_func=get_ip,
    default_limits=['120 per minute'],
    storage_uri='memory://',
)


class WSRateLimiter:
    def __init__(self, max_requests=30, window_seconds=60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._user_requests: dict[str, list[float]] = defaultdict(list)

    def check(self, user_id: str) -> bool:
        now = time.time()
        window_start = now - self.window_seconds
        requests = self._user_requests[user_id]
        self._user_requests[user_id] = [t for t in requests if t > window_start]
        if len(self._user_requests[user_id]) >= self.max_requests:
            logger.warning('ws_rate_limit_exceeded', user_id=user_id)
            return False
        self._user_requests[user_id].append(now)
        return True


ws_rate_limiter = WSRateLimiter()
