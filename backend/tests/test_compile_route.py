from unittest.mock import patch
import json

import pytest

from app import create_app
from app.services.compiler import CompileResult


class TestCompileRoute:
    @pytest.fixture
    def app(self):
        app = create_app()
        app.config['TESTING'] = True
        return app

    @pytest.fixture
    def client(self, app):
        return app.test_client()

    @pytest.fixture
    def mock_auth(self):
        with patch('app.middleware.auth.get_supabase') as mock:
            mock.return_value.auth.get_user.return_value.user.id = 'user-1'
            yield

    def test_compile_missing_auth(self, client):
        resp = client.post('/api/compile', json={'code': 'programa teste\ninicio\nfim\n'})
        assert resp.status_code == 401
        assert resp.get_json()['error'] == 'Missing token'

    def test_compile_invalid_auth(self, client):
        with patch('app.middleware.auth.get_supabase') as mock:
            mock.return_value.auth.get_user.side_effect = Exception('invalid')
            resp = client.post(
                '/api/compile',
                json={'code': 'programa teste\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer bad-token'},
            )
            assert resp.status_code == 401
            assert resp.get_json()['error'] == 'Invalid token'

    def test_compile_missing_code(self, client, mock_auth):
        resp = client.post(
            '/api/compile',
            json={},
            headers={'Authorization': 'Bearer test-token'},
        )
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'Missing required field: code'

    def test_compile_code_not_string(self, client, mock_auth):
        resp = client.post(
            '/api/compile',
            json={'code': 123},
            headers={'Authorization': 'Bearer test-token'},
        )
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'Field code must be a string'

    def test_compile_success(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(success=True, asm='section .text')

            resp = client.post(
                '/api/compile',
                json={'code': 'programa teste\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 200
            assert resp.get_json()['asm'] == 'section .text'

    def test_compile_error_response(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='variavel nao declarada',
                line=5,
                column=12,
                phase='semantic',
            )

            resp = client.post(
                '/api/compile',
                json={'code': 'programa erro\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['error'] == 'variavel nao declarada'
            assert data['line'] == 5
            assert data['column'] == 12
            assert data['phase'] == 'semantic'

    def test_compile_validation_size_error(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='Code exceeds maximum size of 64 KB',
                phase='validation',
            )

            resp = client.post(
                '/api/compile',
                json={'code': 'x' * 70000},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 413
            assert resp.get_json()['error'] == 'Code exceeds maximum size of 64 KB'

    def test_compile_validation_utf8_error(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='Invalid UTF-8 in source code',
                phase='validation',
            )

            resp = client.post(
                '/api/compile',
                json={'code': '\ud800'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            assert resp.get_json()['error'] == 'Invalid UTF-8 in source code'

    def test_compile_timeout(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='Compilation timed out',
                phase='compiler',
            )

            resp = client.post(
                '/api/compile',
                json={'code': 'programa loop\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 408
            assert resp.get_json()['error'] == 'Compilation timed out'

    def test_compile_full_nasm_error_no_line_column(self, client, mock_auth):
        """nasm/ld errors must NOT include line or column in response"""
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='output.asm:5: error: invalid combination of opcode and operands',
                phase='nasm',
            )
            response = client.post(
                '/api/compile',
                data=json.dumps({'code': 'programa x\ninicio\nfim\n'}),
                content_type='application/json',
                headers={'Authorization': 'Bearer valid-token'},
            )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['phase'] == 'nasm'
        assert 'invalid combination' in data['error']
        assert 'line' not in data
        assert 'column' not in data

    def test_compile_full_ld_error_no_line_column(self, client, mock_auth):
        """ld errors must NOT include line or column in response"""
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error="output.o: undefined reference to `_start'",
                phase='ld',
            )
            response = client.post(
                '/api/compile',
                data=json.dumps({'code': 'programa x\ninicio\nfim\n'}),
                content_type='application/json',
                headers={'Authorization': 'Bearer valid-token'},
            )
        assert response.status_code == 400
        data = json.loads(response.data)
        assert data['phase'] == 'ld'
        assert 'undefined reference' in data['error']
        assert 'line' not in data
        assert 'column' not in data
