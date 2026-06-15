import structlog
from flask import Blueprint, jsonify, request
from app.middleware.auth import require_auth
from app.services.compiler import CompilerService

bp = Blueprint('compile', __name__, url_prefix='/api')
logger = structlog.get_logger()
compiler = CompilerService()
SIMPLESC_PHASES = {'lexer', 'parser', 'semantic'}


@bp.route('/compile', methods=['POST'])
@require_auth
def handle_compile():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'Missing required field: code'}), 400
    code = data['code']
    if not isinstance(code, str):
        return jsonify({'error': 'Field code must be a string'}), 400
    result = compiler.compile_full(code)
    if result.success:
        logger.info('compile_success', code_size=len(code))
        return jsonify({'asm': result.asm}), 200
    if result.phase == 'validation':
        logger.warning('compile_validation_error', error=result.error, code_size=len(code))
        status = 413 if 'exceeds maximum size' in result.error else 400
        return jsonify({'error': result.error}), status
    if result.error == 'Compilation timed out':
        logger.warning('compile_timeout', code_size=len(code))
        return jsonify({'error': result.error}), 408
    logger.warning('compile_error', phase=result.phase, line=result.line, error=result.error)
    response: dict = {'error': result.error, 'phase': result.phase}
    if result.line is not None:
        response['line'] = result.line
    if result.column is not None:
        response['column'] = result.column
    return jsonify(response), 400
