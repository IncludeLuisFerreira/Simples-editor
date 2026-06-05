import os
import subprocess

import structlog
from flask import Blueprint, jsonify

bp = Blueprint('health', __name__)
logger = structlog.get_logger()

@bp.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint - público, sem autenticação"""
    components = {}

    # Check simplesc
    try:
        result = subprocess.run(['simplesc', '--version'], capture_output=True, timeout=2)
        components['compiler'] = {'status': 'ok', 'version': 'simplesc 1.0'}
    except Exception as e:
        components['compiler'] = {'status': 'error'}
        logger.warning('compiler_check_failed', error=str(e))

    # Check nasm
    try:
        result = subprocess.run(['nasm', '-v'], capture_output=True, timeout=2)
        components['nasm'] = {'status': 'ok', 'version': result.stdout.decode().strip()}
    except Exception as e:
        components['nasm'] = {'status': 'error'}
        logger.warning('nasm_check_failed', error=str(e))

    # Check docker
    try:
        import docker
        client = docker.from_env()
        client.ping()
        components['docker'] = {'status': 'ok'}
    except Exception as e:
        components['docker'] = {'status': 'error'}
        logger.warning('docker_check_failed', error=str(e))

    # Check supabase
    supabase_url = os.getenv('SUPABASE_URL')
    components['supabase'] = {'status': 'ok' if supabase_url else 'not_configured'}

    response = {
        'status': 'ok',
        'version': '1.0.0',
        'components': components
    }

    logger.info('health_check', components=components)

    return jsonify(response)
