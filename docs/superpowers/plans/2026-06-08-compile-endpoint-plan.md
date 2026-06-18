# Compile Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `POST /api/compile` endpoint that invokes `simplesc` and returns NASM assembly or compile errors.

**Architecture:** `CompilerService` in `services/compiler.py` handles temp dir creation, subprocess invocation, and error parsing. Constructor accepts config params (falls back to env vars), making it testable without Flask app context. `compile_bp` in `routes/compile.py` handles HTTP concerns (auth, request parsing, response). The blueprint is registered in `create_app`.

**Tech Stack:** Python 3.11, Flask, structlog, stdlib (subprocess, uuid, shutil, pathlib, re, dataclasses)

---

### Task 1: CompilerService core

**Files:**
- Create: `backend/app/services/compiler.py`
- Create: `backend/tests/test_compiler_service.py`

- [ ] **Step 1: Write and run failing test for successful compilation**

```python
import os
import subprocess
from unittest.mock import patch, MagicMock

import pytest

from app.services.compiler import CompilerService, CompileResult


class TestCompilerService:
    def test_compile_success(self):
        fake_asm = 'section .text\n    global _start\n_start:\n    mov eax, 1\n    int 0x80\n'

        with patch('app.services.compiler.subprocess.run') as mock_run, \
             patch('app.services.compiler.Path.mkdir') as mock_mkdir, \
             patch('app.services.compiler.Path.write_text') as mock_write, \
             patch('app.services.compiler.Path.read_text', return_value=fake_asm), \
             patch('app.services.compiler.shutil.rmtree') as mock_rmtree:

            mock_run.return_value = MagicMock(returncode=0, stdout='', stderr='')

            service = CompilerService(compile_timeout=15, max_code_kb=64)
            result = service.compile('programa teste\ninicio\nfim\n')

            assert result.success is True
            assert result.asm == fake_asm
            assert result.error is None
            mock_rmtree.assert_called_once()
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_success -v`
Expected: FAIL — ModuleNotFoundError for `app.services.compiler`

- [ ] **Step 2: Write minimal CompilerService to pass success test**

```python
import os
import re
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4


@dataclass
class CompileResult:
    success: bool
    asm: str | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None


_ERROR_RE = re.compile(r'^(?P<phase>\w+):(?P<line>\d+):(?P<column>\d+): (?P<message>.*)$')


class CompilerService:
    def __init__(self, compile_timeout: int | None = None, max_code_kb: int | None = None):
        self._compile_timeout = compile_timeout or int(os.getenv('COMPILE_TIMEOUT_S', '15'))
        self._max_code_bytes = (max_code_kb or int(os.getenv('MAX_CODE_KB', '64'))) * 1024

    def compile(self, code: str) -> CompileResult:
        try:
            code_bytes = code.encode('utf-8')
        except UnicodeEncodeError:
            return CompileResult(success=False, error='Code must be valid UTF-8', phase='validation')

        if len(code_bytes) > self._max_code_bytes:
            return CompileResult(
                success=False,
                error=f'Code exceeds maximum size of {self._max_code_bytes // 1024} KB',
                phase='validation',
            )

        tmpdir = Path(f'/tmp/sim-{uuid4()}')
        try:
            tmpdir.mkdir(parents=True)
            src_path = tmpdir / 'input.simples'
            src_path.write_text(code, encoding='utf-8')

            result = subprocess.run(
                ['simplesc', 'input.simples', '-o', 'output.asm'],
                cwd=tmpdir,
                capture_output=True,
                timeout=self._compile_timeout,
            )

            if result.returncode == 0:
                asm = (tmpdir / 'output.asm').read_text(encoding='utf-8')
                return CompileResult(success=True, asm=asm)

            return self._parse_error(result.stderr.decode('utf-8').strip())

        except subprocess.TimeoutExpired:
            return CompileResult(success=False, error='Compilation timed out', phase='compiler')
        finally:
            shutil.rmtree(tmpdir, ignore_errors=True)

    def _parse_error(self, stderr: str) -> CompileResult:
        match = _ERROR_RE.match(stderr)
        if match:
            return CompileResult(
                success=False,
                error=match.group('message'),
                line=int(match.group('line')),
                column=int(match.group('column')),
                phase=match.group('phase'),
            )
        return CompileResult(success=False, error=stderr or 'Unknown compilation error', phase='compiler')
```

- [ ] **Step 3: Run the success test again**

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_success -v`
Expected: PASS

- [ ] **Step 4: Write and run test for compilation error with parsed stderr**

```python
    def test_compile_lexer_error(self):
        with patch('app.services.compiler.subprocess.run') as mock_run, \
             patch('app.services.compiler.Path.mkdir'), \
             patch('app.services.compiler.Path.write_text'), \
             patch('app.services.compiler.shutil.rmtree'):

            mock_run.return_value = MagicMock(
                returncode=1, stdout='', stderr=b'lexer:3:10: caracter invalido: "@"\n',
            )

            service = CompilerService(compile_timeout=15, max_code_kb=64)
            result = service.compile('programa teste\ninicio\n    x <- 2 @ 3\nfim\n')

            assert result.success is False
            assert result.error == 'caracter invalido: "@"'
            assert result.line == 3
            assert result.column == 10
            assert result.phase == 'lexer'
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_lexer_error -v`
Expected: PASS

- [ ] **Step 5: Write and run test for timeout**

```python
    def test_compile_timeout(self):
        with patch('app.services.compiler.subprocess.run') as mock_run, \
             patch('app.services.compiler.Path.mkdir'), \
             patch('app.services.compiler.Path.write_text'), \
             patch('app.services.compiler.shutil.rmtree'):

            mock_run.side_effect = subprocess.TimeoutExpired(cmd='simplesc', timeout=15)

            service = CompilerService(compile_timeout=15, max_code_kb=64)
            result = service.compile('programa teste\ninicio\nfim\n')

            assert result.success is False
            assert result.error == 'Compilation timed out'
            assert result.phase == 'compiler'
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_timeout -v`
Expected: PASS

- [ ] **Step 6: Write and run test for code size validation**

```python
    def test_compile_code_too_large(self):
        service = CompilerService(compile_timeout=15, max_code_kb=1)
        large_code = 'x' * 1500

        result = service.compile(large_code)

        assert result.success is False
        assert 'exceeds maximum size' in result.error
        assert result.phase == 'validation'
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_code_too_large -v`
Expected: PASS

- [ ] **Step 7: Write and run test for non-parseable stderr (unexpected error)**

```python
    def test_compile_unexpected_error(self):
        with patch('app.services.compiler.subprocess.run') as mock_run, \
             patch('app.services.compiler.Path.mkdir'), \
             patch('app.services.compiler.Path.write_text'), \
             patch('app.services.compiler.shutil.rmtree'):

            mock_run.return_value = MagicMock(
                returncode=1, stdout='', stderr=b'simplesc: internal error: segmentation fault\n',
            )

            service = CompilerService(compile_timeout=15, max_code_kb=64)
            result = service.compile('programa teste\ninicio\nfim\n')

            assert result.success is False
            assert result.error == 'simplesc: internal error: segmentation fault'
            assert result.phase == 'compiler'
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_unexpected_error -v`
Expected: PASS

- [ ] **Step 8: Write and run test for invalid UTF-8 (simulated)**

```python
    def test_compile_invalid_utf8(self):
        service = CompilerService(compile_timeout=15, max_code_kb=64)
        result = service.compile('\ud800')

        assert result.success is False
        assert result.error == 'Code must be valid UTF-8'
        assert result.phase == 'validation'
```

Run: `python -m pytest backend/tests/test_compiler_service.py::TestCompilerService::test_compile_invalid_utf8 -v`
Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add backend/app/services/compiler.py backend/tests/test_compiler_service.py
git commit -m "feat(backend): add CompilerService for simplesc invocation"
```

---

### Task 2: Compile route

**Files:**
- Create: `backend/app/routes/compile.py`
- Create: `backend/tests/conftest.py`
- Create: `backend/tests/__init__.py`
- Modify: `backend/app/__init__.py`
- Create: `backend/tests/test_compile_route.py`

- [ ] **Step 1: Create test infrastructure (conftest with env vars)**

Create `backend/tests/__init__.py`:
```python
# Tests module
```

Create `backend/tests/conftest.py`:
```python
"""Set required env vars before app import. conftest runs before any test."""
import os

os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-testing-only')
os.environ.setdefault('SUPABASE_URL', 'https://test.supabase.co')
os.environ.setdefault('SUPABASE_ANON_KEY', 'test-anon-key')
```

Note: The `config.py` raises `ValueError` at import if `SECRET_KEY` is not set, so conftest must set it first.

- [ ] **Step 2: Write and run failing test for compile route**

```python
import pytest
from app import create_app
from unittest.mock import patch


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
```

Run: `python -m pytest backend/tests/test_compile_route.py -v`
Expected: FAIL — ModuleNotFoundError for `app.routes.compile`

- [ ] **Step 2: Create compile blueprint**

```python
import structlog
from flask import Blueprint, jsonify, request

from app.middleware.auth import require_auth
from app.services.compiler import CompilerService

bp = Blueprint('compile', __name__, url_prefix='/api')
logger = structlog.get_logger()
compiler = CompilerService()


@bp.route('/compile', methods=['POST'])
@require_auth
def compile_code():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'Missing required field: code'}), 400

    code = data['code']
    if not isinstance(code, str):
        return jsonify({'error': 'Field code must be a string'}), 400

    result = compiler.compile(code)

    if result.success:
        logger.info('compile_success', code_size=len(code))
        return jsonify({'asm': result.asm}), 200

    if result.phase == 'validation':
        logger.warning('compile_validation_error', error=result.error, code_size=len(code))
        return jsonify({'error': result.error}), 413

    if result.error == 'Compilation timed out':
        logger.warning('compile_timeout', code_size=len(code))
        return jsonify({'error': result.error}), 408

    logger.warning('compile_error', phase=result.phase, line=result.line, error=result.error)
    return jsonify({
        'error': result.error,
        'line': result.line,
        'column': result.column,
        'phase': result.phase,
    }), 400
```

- [ ] **Step 3: Register blueprint in create_app**

Edit `backend/app/__init__.py` — add `compile` to the import and register it:

```python
    from app.routes import auth, compile, health

    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(compile.bp)
```

- [ ] **Step 4: Write and run route tests with mocked auth + service**

```python
    def test_compile_success(self, app, client):
        with patch('app.middleware.auth.get_supabase') as mock_supabase, \
             patch('app.routes.compile.CompilerService.compile') as mock_compile:

            mock_supabase.return_value.auth.get_user.return_value.user.id = 'user-1'
            mock_compile.return_value = type('Result', (), {
                'success': True, 'asm': 'section .text',
                'error': None, 'line': None, 'column': None, 'phase': None,
            })()

            resp = client.post(
                '/api/compile',
                json={'code': 'programa teste\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer valid_token'},
            )
            assert resp.status_code == 200
            assert resp.get_json()['asm'] == 'section .text'

    def test_compile_error_response(self, app, client):
        with patch('app.middleware.auth.get_supabase') as mock_supabase, \
             patch('app.routes.compile.CompilerService.compile') as mock_compile:

            mock_supabase.return_value.auth.get_user.return_value.user.id = 'user-1'
            mock_compile.return_value = type('Result', (), {
                'success': False, 'asm': None,
                'error': 'variavel nao declarada', 'line': 5,
                'column': 12, 'phase': 'semantic',
            })()

            resp = client.post(
                '/api/compile',
                json={'code': 'programa erro\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer valid_token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['error'] == 'variavel nao declarada'
            assert data['line'] == 5
            assert data['column'] == 12
            assert data['phase'] == 'semantic'

    def test_compile_code_not_string(self, app, client):
        with patch('app.middleware.auth.get_supabase') as mock_supabase:
            mock_supabase.return_value.auth.get_user.return_value.user.id = 'user-1'

            resp = client.post(
                '/api/compile',
                json={'code': 123},
                headers={'Authorization': 'Bearer valid_token'},
            )
            assert resp.status_code == 400
            assert resp.get_json()['error'] == 'Field code must be a string'
```

Add these three tests to the `TestCompileRoute` class (before the auth tests in the file is fine).

Run: `python -m pytest backend/tests/test_compile_route.py -v`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/app/routes/compile.py backend/app/__init__.py backend/tests/test_compile_route.py
git commit -m "feat(backend): add POST /api/compile endpoint"
```

---

### Task 3: Verify with lint

- [ ] **Step 1: Run ruff lint**

```bash
cd backend && ruff check app/ tests/
```

Expected: No errors or warnings.

- [ ] **Step 2: Run all tests**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A && git commit -m "chore: fix lint and test issues"
```

---

### Task 4: Update PROGRESS.md

- [ ] **Step 1: Mark issue #17 as completed**

Edit `PROGRESS.md`: change `- [ ] #17 feat(backend): compile endpoint with simplesc` to `- [x] #17 feat(backend): compile endpoint with simplesc`

- [ ] **Step 2: Commit**

```bash
git add PROGRESS.md
git commit -m "docs: mark #17 compile endpoint as completed"
```
