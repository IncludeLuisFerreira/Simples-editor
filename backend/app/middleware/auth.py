import os
from functools import wraps

from flask import g, jsonify, request
from supabase import Client, create_client

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


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Missing token'}), 401

        try:
            user_response = get_supabase().auth.get_user(token)
            g.user_id = user_response.user.id
            g.user_email = user_response.user.email
        except Exception:
            return jsonify({'error': 'Invalid token'}), 401

        return f(*args, **kwargs)

    return decorated
