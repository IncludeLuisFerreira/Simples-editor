import time

import structlog
from flask import Blueprint, jsonify, request

from app.middleware.auth import require_auth
from app.middleware.ratelimit import get_user_id, limiter
from app.services.compiler import CompilerService
from app.services.metrics import compile_duration, compile_errors_total

bp = Blueprint('compile', __name__, url_prefix='/api')
logger = structlog.get_logger()
compiler = CompilerService()


@bp.route('/compile', methods=['POST'])
@require_auth
@limiter.limit('30 per minute', key_func=get_user_id)
def handle_compile():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'Missing required field: code'}), 400
    code = data['code']
    if not isinstance(code, str):
        return jsonify({'error': 'Field code must be a string'}), 400
    t0 = time.time()
    result = compiler.compile_full(code)
    duration = time.time() - t0
    if result.success:
        compile_duration.labels(phase='total').observe(duration)
        logger.info('compile_success', code_size=len(code))
        response = {'asm': result.asm}
        if result.binary_key:
            response['binary_key'] = result.binary_key
        return jsonify(response), 200
    compile_errors_total.labels(phase=result.phase or 'unknown').inc()
    if result.phase == 'validation':
        logger.warning('compile_validation_error', error=result.error, code_size=len(code))
        status = 413 if 'exceeds maximum size' in result.error else 400
        return jsonify({'error': result.error, 'phase': result.phase}), status
    if result.error == 'Compilation timed out':
        logger.warning('compile_timeout', code_size=len(code))
        return jsonify({'error': result.error, 'phase': result.phase or 'compiler'}), 408
    logger.warning('compile_error', phase=result.phase, line=result.line, error=result.error)
    response: dict = {'error': result.error, 'phase': result.phase}
    if result.line is not None:
        response['line'] = result.line
    if result.column is not None:
        response['column'] = result.column
    return jsonify(response), 400
