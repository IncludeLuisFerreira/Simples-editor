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
    binary_key: str | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None


class CompilerService:
    def __init__(self, compile_timeout: int | None = None, max_code_kb: int | None = None):
        self._compile_timeout = (
            compile_timeout
            if compile_timeout is not None
            else int(os.getenv('COMPILE_TIMEOUT_S', '15'))
        )
        self._max_code_bytes = (
            max_code_kb if max_code_kb is not None else int(os.getenv('MAX_CODE_KB', '64'))
        ) * 1024

    def compile(self, code: str) -> CompileResult:
        try:
            code_bytes = code.encode('utf-8')
        except UnicodeEncodeError:
            return CompileResult(
                success=False, error='Invalid UTF-8 in source code', phase='validation'
            )

        if len(code_bytes) > self._max_code_bytes:
            return CompileResult(
                success=False,
                error=f'Code exceeds maximum size of {self._max_code_bytes // 1024} KB',
                phase='validation',
            )

        tmpdir = None
        try:
            tmpdir = Path(f'/tmp/sim-{uuid4().hex}')
            tmpdir.mkdir(parents=True, exist_ok=True)

            input_path = tmpdir / 'input.simples'
            output_path = tmpdir / 'output.asm'
            input_path.write_text(code, encoding='utf-8')

            result = subprocess.run(
                ['simplesc', str(input_path), '-o', str(output_path)],
                cwd=str(tmpdir),
                capture_output=True,
                timeout=self._compile_timeout,
            )

            if result.returncode == 0:
                if output_path.exists():
                    asm = output_path.read_text(encoding='utf-8')
                    return CompileResult(success=True, asm=asm)
                return CompileResult(
                    success=False, error='Output file not generated', phase='compiler'
                )

            stderr = result.stderr.decode('utf-8', errors='replace')
            match = re.search(
                r'^(?P<phase>\w+):(?P<line>\d+):(?P<column>\d+): (?P<message>.*)$',
                stderr,
                re.MULTILINE,
            )
            if match:
                return CompileResult(
                    success=False,
                    error=match.group('message'),
                    line=int(match.group('line')),
                    column=int(match.group('column')),
                    phase=match.group('phase'),
                )
            return CompileResult(
                success=False, error=stderr.strip() or 'Unknown compilation error', phase='compiler'
            )

        except subprocess.TimeoutExpired:
            return CompileResult(success=False, error='Compilation timed out', phase='compiler')
        finally:
            if tmpdir is not None and tmpdir.exists():
                shutil.rmtree(tmpdir)

    def _parse_simplesc_stderr(self, stderr: bytes) -> CompileResult:
        text = stderr.decode('utf-8', errors='replace')
        match = re.search(
            r'^(?P<phase>\w+):(?P<line>\d+):(?P<column>\d+): (?P<message>.*)$',
            text,
            re.MULTILINE,
        )
        if match:
            return CompileResult(
                success=False,
                error=match.group('message'),
                line=int(match.group('line')),
                column=int(match.group('column')),
                phase=match.group('phase'),
            )
        return CompileResult(
            success=False,
            error=text.strip() or 'Unknown compilation error',
            phase='compiler',
        )

    def compile_full(self, code: str) -> CompileResult:
        try:
            code_bytes = code.encode('utf-8')
        except UnicodeEncodeError:
            return CompileResult(
                success=False, error='Invalid UTF-8 in source code', phase='validation'
            )

        if len(code_bytes) > self._max_code_bytes:
            return CompileResult(
                success=False,
                error=f'Code exceeds maximum size of {self._max_code_bytes // 1024} KB',
                phase='validation',
            )

        tmpdir = None
        try:
            tmpdir = Path(f'/tmp/simples/{uuid4().hex}')
            tmpdir.mkdir(parents=True, exist_ok=True)

            input_path = tmpdir / 'input.simples'
            asm_path = tmpdir / 'output.asm'
            obj_path = tmpdir / 'output.o'
            bin_path = tmpdir / 'programa'

            input_path.write_text(code, encoding='utf-8')

            sc = subprocess.run(
                ['simplesc', str(input_path), '-o', str(asm_path)],
                cwd=str(tmpdir),
                capture_output=True,
                timeout=self._compile_timeout,
            )
            if sc.returncode != 0:
                shutil.rmtree(tmpdir)
                return self._parse_simplesc_stderr(sc.stderr)
            if not asm_path.exists():
                shutil.rmtree(tmpdir)
                return CompileResult(
                    success=False, error='Output file not generated', phase='compiler'
                )
            asm_text = asm_path.read_text(encoding='utf-8')

            nasm = subprocess.run(
                ['nasm', '-f', 'elf32', str(asm_path), '-o', str(obj_path)],
                cwd=str(tmpdir),
                capture_output=True,
                timeout=self._compile_timeout,
            )
            if nasm.returncode != 0:
                shutil.rmtree(tmpdir)
                return CompileResult(
                    success=False,
                    error=nasm.stderr.decode('utf-8', errors='replace').strip() or 'nasm failed',
                    phase='nasm',
                )

            ld = subprocess.run(
                ['i686-linux-gnu-ld', '-m', 'elf_i386', str(obj_path), '-o', str(bin_path)],
                cwd=str(tmpdir),
                capture_output=True,
                timeout=self._compile_timeout,
            )
            if ld.returncode != 0:
                shutil.rmtree(tmpdir)
                return CompileResult(
                    success=False,
                    error=ld.stderr.decode('utf-8', errors='replace').strip() or 'ld failed',
                    phase='ld',
                )

            return CompileResult(success=True, asm=asm_text, binary_key=tmpdir.name)

        except subprocess.TimeoutExpired:
            if tmpdir is not None and tmpdir.exists():
                shutil.rmtree(tmpdir)
            return CompileResult(success=False, error='Compilation timed out', phase='compiler')
