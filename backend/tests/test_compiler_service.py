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
        mock_rmtree.assert_called_once_with(mock_tmpdir)

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


class TestCompilerServiceFull:
    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_full_success(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_file = MagicMock()
        mock_file.exists.return_value = True
        mock_file.read_text.return_value = 'section .text\n    global _start\n'
        mock_tmpdir.__truediv__.return_value = mock_file

        ok = MagicMock(returncode=0, stdout=b'', stderr=b'')
        mock_run.side_effect = [ok, ok, ok]  # simplesc, nasm, ld

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile_full('programa x\ninicio\nfim\n')

        assert result.success
        assert result.asm == 'section .text\n    global _start\n'
        assert mock_run.call_count == 3

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_full_simplesc_error_stops_pipeline(
        self, mock_uuid4, mock_run, mock_path_class, mock_rmtree
    ):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_tmpdir.__truediv__.return_value = MagicMock()

        mock_run.return_value = MagicMock(
            returncode=1, stdout=b'', stderr=b'lexer:2:5: caracter invalido: "@"\n'
        )

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile_full('codigo ruim')

        assert not result.success
        assert result.phase == 'lexer'
        assert result.line == 2
        assert result.column == 5
        assert result.error == 'caracter invalido: "@"'
        assert mock_run.call_count == 1  # para no simplesc

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_full_nasm_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_file = MagicMock()
        mock_file.exists.return_value = True
        mock_file.read_text.return_value = 'section .text\n'
        mock_tmpdir.__truediv__.return_value = mock_file

        ok = MagicMock(returncode=0, stdout=b'', stderr=b'')
        fail_nasm = MagicMock(
            returncode=1, stdout=b'',
            stderr=b'output.asm:5: error: invalid combination of opcode and operands\n',
        )
        mock_run.side_effect = [ok, fail_nasm]  # simplesc ok, nasm falha

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile_full('programa x\ninicio\nfim\n')

        assert not result.success
        assert result.phase == 'nasm'
        assert 'invalid combination' in result.error
        assert result.line is None
        assert result.column is None
        assert mock_run.call_count == 2

    @patch('app.services.compiler.shutil.rmtree')
    @patch('app.services.compiler.Path')
    @patch('app.services.compiler.subprocess.run')
    @patch('app.services.compiler.uuid4')
    def test_compile_full_ld_error(self, mock_uuid4, mock_run, mock_path_class, mock_rmtree):
        mock_uuid4.return_value.hex = 'test-uuid'
        mock_tmpdir = MagicMock()
        mock_path_class.return_value = mock_tmpdir
        mock_file = MagicMock()
        mock_file.exists.return_value = True
        mock_file.read_text.return_value = 'section .text\n'
        mock_tmpdir.__truediv__.return_value = mock_file

        ok = MagicMock(returncode=0, stdout=b'', stderr=b'')
        fail_ld = MagicMock(
            returncode=1, stdout=b'',
            stderr=b"output.o: undefined reference to `_start'\n",
        )
        mock_run.side_effect = [ok, ok, fail_ld]  # simplesc ok, nasm ok, ld falha

        service = CompilerService(compile_timeout=30, max_code_kb=64)
        result = service.compile_full('programa x\ninicio\nfim\n')

        assert not result.success
        assert result.phase == 'ld'
        assert 'undefined reference' in result.error
        assert result.line is None
        assert mock_run.call_count == 3
