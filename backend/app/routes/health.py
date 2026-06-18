import os
import subprocess

import structlog
from flask import Blueprint, jsonify

bp = Blueprint('health', __name__)
logger = structlog.get_logger()


def _check_component(name: str, check_fn, timeout: int = 2):
    try:
        result = check_fn(timeout)
        return {'status': result.pop('status', 'ok'), **result}
    except Exception as e:
        logger.warning('health_check_failed', component=name, error=str(e)[:100])
        return {'status': 'error', 'error': str(e)[:100]}


@bp.route('/api/health', methods=['GET'])
def health():
    components = {
        'compiler': _check_component('compiler', _check_simplesc),
        'nasm': _check_component('nasm', _check_nasm),
        'docker': _check_component('docker', _check_docker),
        'supabase': _check_component('supabase', _check_supabase),
    }

    core_ok = components['compiler']['status'] == 'ok'
    all_ok = all(c['status'] in ('ok', 'configured') for c in components.values())

    if all_ok:
        status = 'healthy'
    elif core_ok:
        status = 'degraded'
    else:
        status = 'unhealthy'

    response = {
        'status': status,
        'version': '1.0.0',
        'components': components,
    }
    http_code = 200 if core_ok else 503
    logger.info(
        'health_check',
        health_status=status,
        components={k: v['status'] for k, v in components.items()},
    )
    return jsonify(response), http_code


def _check_simplesc(timeout: int):
    result = subprocess.run(['simplesc', '--version'], capture_output=True, timeout=timeout)
    version = result.stdout.decode('utf-8', errors='replace').strip() or 'simplesc 1.0'
    return {'version': version}


def _check_nasm(timeout: int):
    result = subprocess.run(['nasm', '-v'], capture_output=True, timeout=timeout)
    version = result.stdout.decode('utf-8', errors='replace').strip() or 'nasm'
    return {'version': version}


def _check_docker(timeout: int):
    import docker

    client = docker.from_env()
    client.ping()
    return {}


def _check_supabase(timeout: int):
    supabase_url = os.getenv('SUPABASE_URL', '')
    jwt_secret = os.getenv('JWT_SECRET', '')
    has_url = bool(supabase_url)
    has_jwt = bool(jwt_secret)
    if not has_url:
        return {'status': 'not_configured', 'config': 'missing SUPABASE_URL'}
    if not has_jwt:
        return {'status': 'not_configured', 'config': 'missing JWT_SECRET'}
    return {'status': 'ok', 'config': 'configured'}
