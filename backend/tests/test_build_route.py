from unittest.mock import patch

import pytest

from app import create_app
from app.services.compiler import BuildResult


class TestBuildRoute:
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

    def test_build_missing_auth(self, client):
        resp = client.post('/api/build', json={'code': 'programa teste\ninicio\nfim\n'})
        assert resp.status_code == 401
        assert resp.get_json()['error'] == 'Missing token'

    def test_build_invalid_auth(self, client):
        with patch('app.middleware.auth.get_supabase') as mock:
            mock.return_value.auth.get_user.side_effect = Exception('invalid')
            resp = client.post(
                '/api/build',
                json={'code': 'programa teste\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer bad-token'},
            )
            assert resp.status_code == 401
            assert resp.get_json()['error'] == 'Invalid token'

    def test_build_missing_code(self, client, mock_auth):
        resp = client.post(
            '/api/build',
            json={},
            headers={'Authorization': 'Bearer test-token'},
        )
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'Missing required field: code'

    def test_build_code_not_string(self, client, mock_auth):
        resp = client.post(
            '/api/build',
            json={'code': 123},
            headers={'Authorization': 'Bearer test-token'},
        )
        assert resp.status_code == 400
        assert resp.get_json()['error'] == 'Field code must be a string'

    def test_build_success(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=True,
                asm='section .text',
                binary='ZmFrZS1lbGY=',
                binary_size=10,
            )

            resp = client.post(
                '/api/build',
                json={'code': 'programa teste\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 200
            data = resp.get_json()
            assert data['asm'] == 'section .text'
            assert data['binary'] == 'ZmFrZS1lbGY='
            assert data['binary_size'] == 10

    def test_build_simplesc_error(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=False,
                error='variavel nao declarada',
                line=5,
                column=12,
                phase='semantic',
            )

            resp = client.post(
                '/api/build',
                json={'code': 'programa erro\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['error'] == 'variavel nao declarada'
            assert data['line'] == 5
            assert data['column'] == 12
            assert data['phase'] == 'semantic'

    def test_build_nasm_error(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=False,
                error='error: instruction expected',
                phase='nasm',
            )

            resp = client.post(
                '/api/build',
                json={'code': 'programa erro\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['error'] == 'error: instruction expected'
            assert data['phase'] == 'nasm'

    def test_build_ld_error(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=False,
                error='undefined reference to _start',
                phase='ld',
            )

            resp = client.post(
                '/api/build',
                json={'code': 'programa erro\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['error'] == 'undefined reference to _start'
            assert data['phase'] == 'ld'

    def test_build_validation_error(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=False,
                error='Code exceeds maximum size of 64 KB',
                phase='validation',
            )

            resp = client.post(
                '/api/build',
                json={'code': 'x' * 70000},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 413
            assert resp.get_json()['error'] == 'Code exceeds maximum size of 64 KB'

    def test_build_timeout(self, app, client, mock_auth):
        with patch('app.routes.build.CompilerService.build') as mock_build:
            mock_build.return_value = BuildResult(
                success=False,
                error='Compilation timed out',
                phase='compiler',
            )

            resp = client.post(
                '/api/build',
                json={'code': 'programa loop\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 408
            assert resp.get_json()['error'] == 'Compilation timed out'
