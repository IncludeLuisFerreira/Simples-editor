import structlog
from flask import Blueprint, jsonify, request

from app.middleware.auth import require_auth
from app.services.compiler import CompilerService

bp = Blueprint('build', __name__, url_prefix='/api')
logger = structlog.get_logger()
compiler = CompilerService()


@bp.route('/build', methods=['POST'])
@require_auth
def handle_build():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'Missing required field: code'}), 400

    code = data['code']
    if not isinstance(code, str):
        return jsonify({'error': 'Field code must be a string'}), 400

    result = compiler.build(code)

    if result.success:
        logger.info('build_success', code_size=len(code), binary_size=result.binary_size)
        return jsonify(
            {'asm': result.asm, 'binary': result.binary, 'binary_size': result.binary_size}
        ), 200

    if result.phase == 'validation':
        logger.warning('build_validation_error', error=result.error, code_size=len(code))
        status = 413 if 'exceeds maximum size' in result.error else 400
        return jsonify({'error': result.error}), status

    if 'timed out' in (result.error or ''):
        logger.warning('build_timeout', phase=result.phase, code_size=len(code))
        return jsonify({'error': result.error}), 408

    logger.warning('build_error', phase=result.phase, line=result.line, error=result.error)
    return jsonify(
        {
            'error': result.error,
            'line': result.line,
            'column': result.column,
            'phase': result.phase,
        }
    ), 400
