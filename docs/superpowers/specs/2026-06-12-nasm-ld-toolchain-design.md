# NASM + LD Toolchain — Design Spec

> Issue #18 · Sprint 2 — Editor e Compilador
> 2026-06-12

## Contexto

O pipeline de compilação atual (`POST /api/compile`) executa apenas `simplesc` e retorna o assembly NASM em texto. Para executar o programa, é necessário completar as etapas de montagem (nasm) e linkagem (ld), gerando um binário ELF i386. Esta issue adiciona essas duas etapas ao backend, criando um novo endpoint que executa o pipeline completo: `simplesc → nasm → ld`.

O Dockerfile do backend já instala `nasm` e `binutils-i686-linux-gnu`, e o `simplesc` já é compilado durante o build da imagem — esses passos de infraestrutura foram concluídos na implementação anterior. O foco aqui é o código Python que orquestra o pipeline.

## Arquitetura

```
POST /api/build { code }
    │
    ▼
require_auth (middleware)
    │
    ▼
build_bp (routes/build.py)
    │
    ▼
CompilerService.build(code)
    │
    ├── compile() — reusa fluxo existente
    │   └── simplesc input.simples → output.asm
    │
    ├── assemble() — novo
    │   └── nasm -f elf32 output.asm → output.o
    │
    ├── link() — novo
    │   └── i686-linux-gnu-ld -m elf_i386 output.o → output.elf
    │
    └── retorna { asm, binary (base64), binary_size }
```

### Separação de responsabilidades

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| Route | `app/routes/build.py` | HTTP (parse request, auth, retornar JSON) |
| Service | `app/services/compiler.py` | Orquestra pipeline (compile → assemble → link) |
| Config | `app/config.py` | Timeouts (já existentes, adicionar ASSEMBLE_TIMEOUT_S e LINK_TIMEOUT_S) |

As funções `assemble()` e `link()` são métodos privados do `CompilerService`. O método público `build(code)` encapsula o pipeline completo.

## API Specification

### `POST /api/build`

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
    "asm": "section .text\n    global _start\n_start:\n    mov eax, 4\n    ...",
    "binary": "f0VMRgEBAQ0AAAA...",
    "binary_size": 4820
}
```

**Error 400 — erro de compilação/montagem/linkagem:**
```json
{
    "error": "mensagem do erro",
    "line": 7,
    "column": 12,
    "phase": "simplesc"
}
```
O campo `phase` pode ser `"simplesc"`, `"nasm"`, ou `"ld"` — indica em qual etapa o pipeline falhou.

**Error 400 — validação de input:**
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

**Error 500 — inesperado:**
```json
{
    "error": "Internal server error"
}
```

## CompilerService.build()

`app/services/compiler.py` (estendendo a classe existente)

### `build(code: str) -> BuildResult`

```python
@dataclass
class BuildResult:
    success: bool
    asm: str | None = None
    binary: str | None = None       # base64
    binary_size: int | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None
```

### Fluxo

1. **Validação de input** (reusa a mesma do `compile()`)
   - `len(code.encode('utf-8')) <= MAX_CODE_KB * 1024`
   - Tentativa `code.encode('utf-8')` — se falhar, retorna erro 400

2. **Temp dir** (reusa mesmo padrão)
   - `tmpdir = Path(f'/tmp/sim-{uuid4()}')`
   - `tmpdir.mkdir(parents=True, exist_ok=True)`

3. **compile** — executa `simplesc input.simples -o output.asm`
   - Se exit != 0 → retorna `BuildResult(success=False, error=..., line=..., column=..., phase="simplesc")`
   - Se output.asm não existir → retorna erro com `phase="simplesc"`

4. **assemble** — executa `nasm -f elf32 output.asm -o output.o`
   - Se exit != 0 → retorna `BuildResult(success=False, error=stderr, phase="nasm")`
   - Se output.o não existir → retorna erro com `phase="nasm"`

5. **link** — executa `i686-linux-gnu-ld -m elf_i386 output.o -o output.elf`
   - Se exit != 0 → retorna `BuildResult(success=False, error=stderr, phase="ld")`
   - Se output.elf não existir → retorna erro com `phase="ld"`

6. **Sucesso**
   - Lê `output.asm` → texto
   - Lê `output.elf` → binário, codifica em base64
   - Retorna `BuildResult(success=True, asm=..., binary=base64, binary_size=len(elf_bytes))`

7. **Cleanup** (finally)
   - `shutil.rmtree(tmpdir, ignore_errors=True)`

### Configurações

Adicionar ao `config.py` ou variáveis de ambiente:
- `ASSEMBLE_TIMEOUT_S` (default: 10) — timeout para `nasm`
- `LINK_TIMEOUT_S` (default: 10) — timeout para `ld`

### Error handling adicional

- Cada etapa tem seu próprio `subprocess.run` com timeout específico
- `subprocess.TimeoutExpired` → loga + `BuildResult(error="Assembly timed out", phase="nasm")` (ou `"ld"`)
- `OSError` (falha ao criar diretório, escrever arquivo) → loga + erro 500
- Se `compile()` falhar, o fluxo **para imediatamente** — não tenta nasm sem .asm válido

## Security

- **Auth**: `require_auth` decorator (mesmo padrão de outras rotas)
- **Input validation**: tamanho e encoding checados antes de escrever no disco
- **Temp dirs**: UUID aleatório previne colisão; cleanup no finally garante que não acumule
- **Command injection**: `nasm` e `ld` são chamados com argumentos fixos; o código fonte é passado via arquivo, não como argumento
- **subprocess.run com timeout**: evita que processos travem o worker
- **Binary output**: ELF binário é retornado como base64 (texto seguro), não como attachment

## Testes

- `CompilerService.build(code_valido)` → `result.success == True`, `result.asm` contém código NASM, `result.binary` é base64 decodável, `result.binary_size > 0`
- `CompilerService.build(code_com_erro_simplesc)` → `result.success == False`, `result.phase == "simplesc"`
- `CompilerService.build(code_asm_invalido)` → mock `nasm` falhando → `result.phase == "nasm"`
- `CompilerService.build(code_erro_link)` → mock `ld` falhando → `result.phase == "ld"`
- Mock `subprocess.run` para simular timeout em cada fase
- Teste de validação (código muito grande, UTF-8 inválido) — reusa lógica do compile

## Dependências

Nenhuma nova biblioteca Python. Stdlib: `subprocess`, `uuid`, `shutil`, `pathlib`, `base64`, `dataclasses`.

## Dockerfile

Nenhuma alteração necessária. O Dockerfile do backend já instala `nasm` e `binutils-i686-linux-gnu` e compila `simplesc` durante o build. Confirmar que os binários estão no PATH:
- `nasm` → `/usr/bin/nasm`
- `i686-linux-gnu-ld` → `/usr/bin/i686-linux-gnu-ld`
- `simplesc` → `/usr/local/bin/simplesc`

## Relações com outras issues

- #17 (compile endpoint): `build()` reusa o fluxo de `compile()` como primeiro passo
- #19 (NASM viewer panel): consome `{ asm }` — não é afetado por esta issue
- #20 (run endpoint): consumirá `{ binary }` (base64) para executar o ELF no sandbox com QEMU
