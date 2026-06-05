import os

from flask import Blueprint, jsonify, request
from supabase import Client, create_client

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

_supabase: Client | None = None

def get_supabase() -> Client:
    global _supabase
    if _supabase is None:
        url = os.getenv('SUPABASE_URL', '').rstrip('/')
        if url.endswith('/rest/v1'):
            url = url.replace('/rest/v1', '')
        key = os.getenv('SUPABASE_ANON_KEY')
        _supabase = create_client(url, key)
    return _supabase

@bp.route('/verify', methods=['POST'])
def verify():
    data = request.get_json()
    token = data.get('token') if data else None

    if not token:
        return jsonify({'valid': False, 'error': 'Missing token'}), 400

    try:
        user_response = get_supabase().auth.get_user(token)
        return jsonify({
            'valid': True,
            'user': {
                'id': user_response.user.id,
                'email': user_response.user.email,
            },
        }), 200
    except Exception as e:
        return jsonify({'valid': False, 'error': str(e)}), 401
