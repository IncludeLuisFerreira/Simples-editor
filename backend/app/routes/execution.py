import json
from urllib.parse import parse_qs

import structlog

from app.middleware.auth import get_supabase
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

    logger.info('execution_ws_connected', user_id=user_id)
    strategy = PtyExecutionStrategy()

    try:
        for msg in ws:
            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                continue
            msg_type = data.get('type', '')
            if msg_type == 'execute':
                binary_key = data.get('binary_key', '')
                if binary_key:
                    strategy.spawn(ws, binary_session_key=binary_key)
            elif msg_type == 'input':
                strategy.write(data.get('data', ''))
            elif msg_type == 'stop':
                strategy.terminate(ws)
                break
    except Exception as exc:
        logger.exception('execution_ws_error', user_id=user_id)
        try:
            ws.send(json.dumps({'type': 'error', 'data': f'Execution failed: {exc}'}))
        except Exception:
            pass
    finally:
        strategy.cleanup()
        logger.info('execution_ws_disconnected', user_id=user_id)
