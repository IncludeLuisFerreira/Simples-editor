# Compile Endpoint — Design Spec

> Issue #17 · Sprint 2 — Editor e Compilador
> 2026-06-08

## Contexto

Criar endpoint REST que recebe código SIMPLES, invoca `simplesc`, e retorna o assembly NASM gerado ou erros de compilação com linha/coluna/fase. É o primeiro passo do pipeline `simplesc → nasm → ld → execução`, servindo de base para o painel NASM (#19) e os markers de erro (#20).

## Arquitetura

```
POST /api/compile { code }
    │
    ▼
require_auth (middleware)
    │
    ▼
compile_bp (routes/compile.py)
    │
    ▼
CompilerService.compile(code)
    │
    ├── valida input (tamanho, encoding)
    ├── cria /tmp/sim-<uuid>/
    ├── escreve input.simples
    ├── subprocess.run(["simplesc", "input.simples", "-o", "output.asm"],
    │                  timeout=COMPILE_TIMEOUT_S,
    │                  capture_output=True, cwd=tmpdir)
    ├── se exit 0 → lê output.asm → { asm }
    ├── se exit != 0 → parseia stderr → { error, line, column, phase }
    └── finally → limpa /tmp/sim-<uuid>/
    │
    ▼
Resposta JSON
```

### Separação de responsabilidades

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Route | `app/routes/compile.py` | HTTP (parse request, auth, retornar JSON) |
| Service | `app/services/compiler.py` |Domínio (temp dir, subprocess, parse de erro) |
| Config | `app/config.py` | Timeouts e limites (já existentes) |

## API Specification

### `POST /api/compile`

**Headers:**
- `Authorization: Bearer <supabase-jwt>` (obrigatório)
- `Content-Type: application/json`

**Request body:**
```json
{
    "code": "programa exemplo\ninteiro x\ninicio\n    x <- 2 + 3\n    escreva x\nfim\n"
}
```

**Success 200:**
```json
{
    "asm": "section .text\n    global _start\n_start:\n    ..."
}
```

**Error 400 — compile error:**
```json
{
    "error": "variavel 'y' nao declarada",
    "line": 7,
    "column": 12,
    "phase": "semantic"
}
```

**Error 400 — validation:**
```json
{
    "error": "Code exceeds maximum size of 64 KB"
}
```

**Error 401 — missing/invalid token:**
```json
{
    "error": "Missing token"
}
```

**Error 500 — unexpected:**
```json
{
    "error": "Internal server error"
}
```

## CompilerService

`app/services/compiler.py`

### `compile(code: str) -> CompileResult`

```python
@dataclass
class CompileResult:
    success: bool
    asm: str | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None
```

**Fluxo:**

1. **Validação de input:**
   - `len(code.encode('utf-8')) <= MAX_CODE_KB * 1024` — senão retorna erro 413
   - Tentativa `code.encode('utf-8')` — se falhar, retorna erro 400 "Invalid UTF-8"

2. **Temp dir:**
   - `tmpdir = Path(f'/tmp/sim-{uuid4()}')`
   - `tmpdir.mkdir(parents=True, exist_ok=False)`

3. **Escreve código fonte:**
   - `(tmpdir / 'input.simples').write_text(code, encoding='utf-8')`

4. **Executa simplesc:**
   ```python
   result = subprocess.run(
       ['simplesc', 'input.simples', '-o', 'output.asm'],
       cwd=tmpdir,
       capture_output=True,
       timeout=COMPILE_TIMEOUT_S,
   )
   ```

5. **Sucesso (exit 0):**
   - Lê `(tmpdir / 'output.asm').read_text(encoding='utf-8')`
   - Retorna `CompileResult(success=True, asm=...)`

6. **Erro de compilação (exit != 0):**
   - Parseia stderr com regex:
     ```python
     pattern = r'^(?P<phase>\w+):(?P<line>\d+):(?P<column>\d+): (?P<message>.*)$'
     ```
   - Se match: retorna `CompileResult(success=False, error=msg, line=int, column=int, phase=phase)`
   - Se não parsear (erro inesperado do simplesc): retorna mensagem genérica com phase="compiler"

7. **Cleanup (finally):**
   - `shutil.rmtree(tmpdir, ignore_errors=True)`

8. **Logging:**
   - `logger.info("compile_started", code_size=len(code))`
   - `logger.info("compile_success", duration_ms=...)`
   - `logger.warning("compile_error", phase=..., line=..., duration_ms=...)`
   - `logger.error("compile_failed", error=..., duration_ms=...)`

### Error handling adicional

- `subprocess.TimeoutExpired`: loga + retorna `CompileResult(error="Compilation timed out", phase="compiler")`
- `OSError` (falha ao criar diretório, escrever arquivo): loga + retorna erro 500
- Exceções não esperadas no route são capturadas por handler 500 global

## Security

- **Auth**: `require_auth` decorator verifica JWT Supabase (mesmo padrão de outras rotas)
- **Input validation**: tamanho e encoding checados antes de escrever no disco
- **Temp dirs**: UUID aleatório previne colisão; cleanup garante que não acumule
- **Command injection**: `simplesc` é chamado com argumentos fixos (input.simples, -o, output.asm); o código fonte é escrito em arquivo, não passado como argumento
- **subprocess.run com timeout**: evita que compilador trave o worker
- **stderr sanitizado**: mensagens de erro são limitadas pelo tamanho do buffer do simplesc (256 bytes)

## Testes (#40)

- `CompilerService.compile(code_sucesso)` → asserts `result.success` e `result.asm` não vazio
- `CompilerService.compile(code_com_erro_lexer)` → asserts `result.success == False`, `result.phase == "lexer"`
- `CompilerService.compile(code_com_erro_parser)` → idem
- `CompilerService.compile(code_com_erro_semantic)` → idem
- `CompilerService.compile(code_vazio)` → erro esperado
- `CompilerService.compile(codigo_muito_grande)` → validação de tamanho
- `CompilerService.compile(encoding_invalido)` → validação de UTF-8
- Mock `subprocess.run` para simular timeout

## Dependências

Nenhuma nova biblioteca. Stdlib: `subprocess`, `uuid`, `shutil`, `pathlib`, `re`, `dataclasses`.

## Relações com outras issues

- #18 (nasm + ld toolchain): este endpoint só compila até NASM; o assembly/link será adicionado depois
- #19 (NASM viewer panel): consome `{ asm }` deste endpoint
- #20 (compile error markers): consome `{ error, line, column, phase }` deste endpoint
- #40 (testes unitários): cobertura do `CompilerService`
