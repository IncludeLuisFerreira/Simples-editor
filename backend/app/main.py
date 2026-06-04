from flask import Flask, jsonify
import subprocess
import os

app = Flask(__name__)

@app.route('/api/health', methods=['GET'])
def health():
    components = {}
    
    # Check simplesc
    try:
        result = subprocess.run(['simplesc', '--version'], capture_output=True, timeout=2)
        components['compiler'] = {'status': 'ok', 'version': 'simplesc 1.0'}
    except Exception:
        components['compiler'] = {'status': 'error'}
    
    # Check nasm
    try:
        result = subprocess.run(['nasm', '-v'], capture_output=True, timeout=2)
        components['nasm'] = {'status': 'ok', 'version': result.stdout.decode().strip()}
    except Exception:
        components['nasm'] = {'status': 'error'}
    
    # Check docker
    try:
        import docker
        client = docker.from_env()
        client.ping()
        components['docker'] = {'status': 'ok'}
    except Exception:
        components['docker'] = {'status': 'error'}
    
    # Check supabase
    supabase_url = os.getenv('SUPABASE_URL')
    components['supabase'] = {'status': 'ok' if supabase_url else 'not_configured'}
    
    return jsonify({
        'status': 'ok',
        'version': '1.0.0',
        'components': components
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
