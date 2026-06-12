import base64
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


@dataclass
class BuildResult:
    success: bool
    asm: str | None = None
    binary: str | None = None
    binary_size: int | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None


class CompilerService:
    def __init__(
        self,
        compile_timeout: int | None = None,
        max_code_kb: int | None = None,
        assemble_timeout: int | None = None,
        link_timeout: int | None = None,
    ):
        self._compile_timeout = (
            compile_timeout
            if compile_timeout is not None
            else int(os.getenv('COMPILE_TIMEOUT_S', '15'))
        )
        self._max_code_bytes = (
            max_code_kb if max_code_kb is not None else int(os.getenv('MAX_CODE_KB', '64'))
        ) * 1024
        self._assemble_timeout = (
            assemble_timeout
            if assemble_timeout is not None
            else int(os.getenv('ASSEMBLE_TIMEOUT_S', '10'))
        )
        self._link_timeout = (
            link_timeout if link_timeout is not None else int(os.getenv('LINK_TIMEOUT_S', '10'))
        )

    def _validate(self, code: str) -> str | None:
        try:
            code_bytes = code.encode('utf-8')
        except UnicodeEncodeError:
            return 'Invalid UTF-8 in source code'
        if len(code_bytes) > self._max_code_bytes:
            return f'Code exceeds maximum size of {self._max_code_bytes // 1024} KB'
        return None

    def compile(self, code: str) -> CompileResult:
        validation_error = self._validate(code)
        if validation_error:
            return CompileResult(success=False, error=validation_error, phase='validation')

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
                shutil.rmtree(tmpdir, ignore_errors=True)

    def _assemble(self, asm_path: Path, output_path: Path) -> str | None:
        try:
            result = subprocess.run(
                ['nasm', '-f', 'elf32', str(asm_path), '-o', str(output_path)],
                capture_output=True,
                timeout=self._assemble_timeout,
            )
            if result.returncode != 0:
                return (
                    result.stderr.decode('utf-8', errors='replace').strip()
                    or 'Assembly failed with unknown error'
                )
            if not output_path.exists():
                return 'Object file not generated'
            return None
        except subprocess.TimeoutExpired:
            return 'Assembly timed out'

    def _link(self, obj_path: Path, output_path: Path) -> str | None:
        try:
            result = subprocess.run(
                ['i686-linux-gnu-ld', '-m', 'elf_i386', str(obj_path), '-o', str(output_path)],
                capture_output=True,
                timeout=self._link_timeout,
            )
            if result.returncode != 0:
                return (
                    result.stderr.decode('utf-8', errors='replace').strip()
                    or 'Link failed with unknown error'
                )
            if not output_path.exists():
                return 'Binary not generated'
            return None
        except subprocess.TimeoutExpired:
            return 'Link timed out'

    def build(self, code: str) -> BuildResult:
        validation_error = self._validate(code)
        if validation_error:
            return BuildResult(success=False, error=validation_error, phase='validation')

        tmpdir = None
        try:
            tmpdir = Path(f'/tmp/sim-{uuid4().hex}')
            tmpdir.mkdir(parents=True, exist_ok=True)

            input_path = tmpdir / 'input.simples'
            asm_path = tmpdir / 'output.asm'
            obj_path = tmpdir / 'output.o'
            elf_path = tmpdir / 'output.elf'

            input_path.write_text(code, encoding='utf-8')

            compile_result = subprocess.run(
                ['simplesc', str(input_path), '-o', str(asm_path)],
                cwd=str(tmpdir),
                capture_output=True,
                timeout=self._compile_timeout,
            )

            if compile_result.returncode != 0:
                stderr = compile_result.stderr.decode('utf-8', errors='replace')
                match = re.search(
                    r'^(?P<phase>\w+):(?P<line>\d+):(?P<column>\d+): (?P<message>.*)$',
                    stderr,
                    re.MULTILINE,
                )
                if match:
                    return BuildResult(
                        success=False,
                        error=match.group('message'),
                        line=int(match.group('line')),
                        column=int(match.group('column')),
                        phase=match.group('phase'),
                    )
                return BuildResult(
                    success=False,
                    error=stderr.strip() or 'Unknown compilation error',
                    phase='compiler',
                )

            if not asm_path.exists():
                return BuildResult(
                    success=False, error='Assembly output not generated', phase='compiler'
                )

            asm_text = asm_path.read_text(encoding='utf-8')

            nasm_error = self._assemble(asm_path, obj_path)
            if nasm_error:
                return BuildResult(success=False, error=nasm_error, phase='nasm')

            ld_error = self._link(obj_path, elf_path)
            if ld_error:
                return BuildResult(success=False, error=ld_error, phase='ld')

            elf_bytes = elf_path.read_bytes()
            return BuildResult(
                success=True,
                asm=asm_text,
                binary=base64.b64encode(elf_bytes).decode(),
                binary_size=len(elf_bytes),
            )

        except subprocess.TimeoutExpired:
            return BuildResult(success=False, error='Compilation timed out', phase='compiler')
        finally:
            if tmpdir is not None and tmpdir.exists():
                shutil.rmtree(tmpdir, ignore_errors=True)
