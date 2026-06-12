import base64
import subprocess
from unittest.mock import MagicMock, patch

from app.services.compiler import CompilerService


class TestCompilerService:
    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_success(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        mock_output = MagicMock()
        mock_output.exists.return_value = True
        mock_output.read_text.return_value = 'section .text\n'
        mock_tmpdir.__truediv__.return_value = mock_output

        mock_run.return_value = MagicMock(returncode=0, stdout=b'', stderr=b'')

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile('test code')

        assert result.success
        assert result.asm == 'section .text\n'
        mock_tmpdir.mkdir.assert_called_once_with(parents=True, exist_ok=True)
        mock_output.write_text.assert_called_once_with('test code', encoding='utf-8')
        mock_run.assert_called_once()
        mock_rmtree.assert_called_once_with(mock_tmpdir, ignore_errors=True)

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_lexer_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_tmpdir.__truediv__.return_value = MagicMock()

        mock_run.return_value = MagicMock(
            returncode=1, stdout=b'', stderr=b'lexer:3:10: caracter invalido: "@"\n'
        )

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile('test code')

        assert not result.success
        assert result.error == 'caracter invalido: "@"'
        assert result.line == 3
        assert result.column == 10
        assert result.phase == 'lexer'

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_timeout(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_tmpdir.__truediv__.return_value = MagicMock()

        mock_run.side_effect = subprocess.TimeoutExpired(cmd='simplesc', timeout=30)

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile('test code')

        assert not result.success
        assert result.error == 'Compilation timed out'
        assert result.phase == 'compiler'

    def test_compile_code_too_large(self):
        service = CompilerService(max_code_kb=1)
        code = 'x' * 1500
        result = service.compile(code)

        assert not result.success
        assert result.error == 'Code exceeds maximum size of 1 KB'
        assert result.phase == 'validation'

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_unexpected_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_tmpdir.__truediv__.return_value = MagicMock()

        mock_run.return_value = MagicMock(returncode=1, stdout=b'', stderr=b'some unexpected error')

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile('test code')

        assert not result.success
        assert result.error == 'some unexpected error'
        assert result.phase == 'compiler'

    def test_compile_invalid_utf8(self):
        service = CompilerService(compile_timeout=30, max_code_kb=64)
        code = '\ud800'
        result = service.compile(code)

        assert not result.success
        assert result.error == 'Invalid UTF-8 in source code'
        assert result.phase == 'validation'


class TestCompilerServiceBuild:
    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_success(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        asm_content = 'section .text\n    global _start\n_start:\n    mov eax, 1\n'
        elf_content = b'\x7fELF\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x00'

        def mock_div(key):
            mock = MagicMock()
            if key == 'output.asm':
                mock.exists.return_value = True
                mock.read_text.return_value = asm_content
            elif key == 'output.o':
                mock.exists.return_value = True
            elif key == 'output.elf':
                mock.exists.return_value = True
                mock.read_bytes.return_value = elf_content
            return mock

        mock_tmpdir.__truediv__.side_effect = mock_div

        mock_run.return_value = MagicMock(returncode=0, stdout=b'', stderr=b'')

        service = CompilerService(
            compile_timeout=30, max_code_kb=64, assemble_timeout=10, link_timeout=10
        )
        result = service.build('test code')

        assert result.success
        assert result.asm == asm_content
        assert result.binary == base64.b64encode(elf_content).decode()
        assert result.binary_size == len(elf_content)
        assert mock_run.call_count == 3

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_simplesc_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        mock_output = MagicMock()
        mock_output.exists.return_value = False
        mock_tmpdir.__truediv__.return_value = mock_output

        mock_run.return_value = MagicMock(
            returncode=1, stdout=b'', stderr=b'semantic:5:12: variable not declared'
        )

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.build('test code')

        assert not result.success
        assert result.phase == 'compiler'
        assert result.line == 5
        assert result.column == 12
        assert result.error == 'variable not declared'

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_nasm_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        def mock_div(key):
            if key == 'output.asm':
                mock = MagicMock()
                mock.exists.return_value = True
                mock.read_text.return_value = 'section .text'
                return mock
            elif key == 'output.o':
                return MagicMock()
            elif key == 'output.elf':
                return MagicMock()
            return MagicMock()

        mock_tmpdir.__truediv__.side_effect = mock_div

        def run_side_effect(*args, **kwargs):
            cmd = args[0]
            if 'simplesc' in cmd[0]:
                return MagicMock(returncode=0, stdout=b'', stderr=b'')
            elif 'nasm' in cmd[0]:
                return MagicMock(returncode=1, stdout=b'', stderr=b'error: instruction expected')
            return MagicMock(returncode=0)

        mock_run.side_effect = run_side_effect

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.build('test code')

        assert not result.success
        assert result.phase == 'nasm'
        assert 'instruction expected' in (result.error or '')

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_ld_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        def mock_div(key):
            if key == 'output.asm':
                mock = MagicMock()
                mock.exists.return_value = True
                mock.read_text.return_value = 'section .text'
                return mock
            elif key == 'output.o':
                mock = MagicMock()
                mock.exists.return_value = True
                return mock
            elif key == 'output.elf':
                mock = MagicMock()
                mock.exists.return_value = False
                return mock
            return MagicMock()

        mock_tmpdir.__truediv__.side_effect = mock_div

        def run_side_effect(*args, **kwargs):
            cmd = args[0]
            if 'simplesc' in cmd[0]:
                return MagicMock(returncode=0, stdout=b'', stderr=b'')
            elif 'nasm' in cmd[0]:
                return MagicMock(returncode=0, stdout=b'', stderr=b'')
            elif 'ld' in cmd[0]:
                return MagicMock(returncode=1, stdout=b'', stderr=b'undefined reference to _start')
            return MagicMock(returncode=0)

        mock_run.side_effect = run_side_effect

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.build('test code')

        assert not result.success
        assert result.phase == 'ld'
        assert 'undefined reference' in (result.error or '')

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_nasm_timeout(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir

        mock_asm = MagicMock()
        mock_asm.exists.return_value = True
        mock_asm.read_text.return_value = 'section .text'
        mock_tmpdir.__truediv__.return_value = mock_asm

        def run_side_effect(*args, **kwargs):
            cmd = args[0]
            if 'simplesc' in cmd[0]:
                return MagicMock(returncode=0, stdout=b'', stderr=b'')
            raise subprocess.TimeoutExpired(cmd='nasm', timeout=10)

        mock_run.side_effect = run_side_effect

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.build('test code')

        assert not result.success
        assert result.error == 'Assembly timed out'
        assert result.phase == 'nasm'

    def test_build_code_too_large(self):
        service = CompilerService(max_code_kb=1)
        code = 'x' * 1500
        result = service.build(code)

        assert not result.success
        assert result.error == 'Code exceeds maximum size of 1 KB'
        assert result.phase == 'validation'

    def test_build_invalid_utf8(self):
        service = CompilerService(compile_timeout=30, max_code_kb=64)
        code = '\ud800'
        result = service.build(code)

        assert not result.success
        assert result.error == 'Invalid UTF-8 in source code'
        assert result.phase == 'validation'

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_build_simplesc_timeout(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_tmpdir.__truediv__.return_value = MagicMock()

        mock_run.side_effect = subprocess.TimeoutExpired(cmd='simplesc', timeout=30)

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.build('test code')

        assert not result.success
        assert result.phase == 'compiler'
        assert result.error == 'Compilation timed out'
