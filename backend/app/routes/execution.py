import json
from urllib.parse import parse_qs
from uuid import uuid4

import structlog

from app.middleware.auth import get_supabase
from app.middleware.logging import hash_user_id
from app.middleware.ratelimit import ws_rate_limiter
from app.services.validation import validate_stdin
from app.strategies.execution import PtyExecutionStrategy

logger = structlog.get_logger()


def handle_execution_ws(ws):
    qs = parse_qs(ws.environ.get('QUERY_STRING', ''))
    token = qs.get('token', [None])[0]
    if not token:
        ws.close(4001, 'Missing token')
        return

    try:
        user_response = get_supabase().auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        ws.close(4001, 'Invalid token')
        return

    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        request_id=uuid4().hex[:12],
        user_id=hash_user_id(user_id),
    )
    logger.info('execution_ws_connected')
    strategy = PtyExecutionStrategy()

    try:
        while True:
            msg = ws.receive()
            if msg is None:
                break
            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                continue
            msg_type = data.get('type', '')
            if msg_type == 'execute':
                if not ws_rate_limiter.check(user_id):
                    ws.send(
                        json.dumps(
                            {
                                'type': 'error',
                                'data': 'Rate limit exceeded. Maximo de 30 execucoes por minuto.',
                            }
                        )
                    )
                    continue
                binary_key = data.get('binary_key', '')
                if binary_key:
                    strategy.spawn(ws, binary_session_key=binary_key)
            elif msg_type == 'input':
                stdin_data = data.get('data', '')
                stdin_error = validate_stdin(stdin_data)
                if stdin_error:
                    ws.send(json.dumps({'type': 'error', 'data': stdin_error}))
                    continue
                strategy.write(stdin_data)
            elif msg_type == 'stop':
                strategy.terminate(ws)
                break
    except Exception as exc:
        logger.exception('execution_ws_error')
        try:
            ws.send(json.dumps({'type': 'error', 'data': f'Execution failed: {exc}'}))
        except Exception:
            pass
    finally:
        strategy.cleanup()
        logger.info('execution_ws_disconnected')
