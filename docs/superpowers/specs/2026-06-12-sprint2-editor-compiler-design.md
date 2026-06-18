# Design — Sprint 2: Editor & Compilador (Issues #15, #18, #19, #20)

> **Sessão de brainstorming:** 2026-06-12  
> **Escopo:** Issues pendentes da Sprint 2 do Simples Editor  
> **Fontes de verdade:** `prd-simples-online.md`, `PROGRESS.md`

---

## Contexto

A Sprint 1 está 100% completa (Docker Compose, Flask, TanStack Start, Nginx, auth Supabase via JWT assimétrico). Na Sprint 2, as issues #16 e #17 estão concluídas:

- **#16**: `SimplesEditor.tsx` integrado com Monaco, tokenizer Monarch esqueletado (sem comentários ainda), tema `simples-dark` definido.
- **#17**: `POST /api/compile` invoca `simplesc` e retorna `{asm}` ou `{error, line, column, phase}`. O `CompilerService` parseia o stderr do `simplesc` com regex `phase:line:column: message`.

Este documento especifica a arquitetura e os contratos para as quatro issues restantes.

---

## Issue #15 — Monaco SIMPLES Tokenizer (completar)

### Decisões

**Comentários:** A linguagem SIMPLES suporta comentários de linha única iniciando com `//`. O frontend deve colori-los como token `comment` (verde no tema dark). **Não existem** comentários de bloco (`{...}` ou `/* ... */`).

**Strings:** Fora de escopo. SIMPLES não aceita literais de string. `escreva` recebe apenas variáveis ou expressões matemáticas (`escreva x`). Nenhuma regra de string deve ser adicionada.

**Números:** `TOK_NUM_INT` (ex: `42`) e `TOK_NUM_FLOAT` (ex: `3.14`) — já cobertos pelo tokenizer atual.

**Keywords:** A lista de 27 palavras reservadas em `simples-lang.ts` está correta e completa.

### Mudança necessária em `SimplesEditor.tsx`

Adicionar a regra de comentário **antes** da regra de identificador no `tokenizer.root`, para que `//` não seja tokenizado como dois operadores de divisão:

```ts
// No array tokenizer.root, ANTES da regra [/[a-zA-Z_]\w*/,...]:
[/\/\/.*$/, 'comment'],
```

E no tema `simples-dark`, a regra já existe: `{ token: 'comment', foreground: '66bb6a' }`.

Nenhuma outra alteração necessária para fechar #15.

---

## Issue #18 — Toolchain nasm + ld no backend

### Escopo Sprint 2

O endpoint `POST /api/compile` passa a executar o pipeline completo de compilação:

```
simplesc input.simples -o output.asm
  → nasm -f elf32 output.asm -o output.o
    → i686-linux-gnu-ld -m elf_i386 output.o -o programa
```

O binário resultante **não é retornado nem executado** nesta sprint (isso é Sprint 3, via WebSocket). O objetivo é: (1) validar o pipeline completo, (2) retornar o ASM para o painel NASM, (3) detectar e reportar erros de cada fase com o `phase` correto.

### Arquitetura: extensão do `CompilerService`

O `CompilerService` ganha um novo método `compile_full()` (ou o método `compile()` existente é estendido com um parâmetro `full=True`). **Recomendação: novo método `compile_full()`** para não quebrar os testes existentes do `compile()`.

```python
@dataclass
class CompileResult:
    success: bool
    asm: str | None = None          # conteúdo do .asm (preenchido se simplesc OK)
    error: str | None = None
    line: int | None = None         # linha no código SIMPLES (só para phase simplesc)
    column: int | None = None       # coluna no código SIMPLES (só para phase simplesc)
    phase: str | None = None        # 'lexer'|'parser'|'semantic'|'nasm'|'ld'|'validation'
```

O `dataclass` existente já suporta todos os campos necessários — apenas `phase` precisa ter seus valores possíveis documentados.

### Lógica de `compile_full()`

`compile_full()` gerencia seu **próprio tmpdir** do início ao fim — não chama `compile()` internamente porque aquele método limpa o tmpdir ao encerrar, e o `.asm` precisa persistir para o nasm consumir na etapa seguinte.

```python
def compile_full(self, code: str) -> CompileResult:
    # Validação (idêntica ao compile())
    ...

    tmpdir = Path(f'/tmp/sim-{uuid4().hex}')
    try:
        tmpdir.mkdir(parents=True, exist_ok=True)
        input_path  = tmpdir / 'input.simples'
        asm_path    = tmpdir / 'output.asm'
        obj_path    = tmpdir / 'output.o'
        bin_path    = tmpdir / 'programa'
        input_path.write_text(code, encoding='utf-8')

        # 1. simplesc
        sc = subprocess.run(
            ['simplesc', str(input_path), '-o', str(asm_path)],
            cwd=str(tmpdir), capture_output=True, timeout=self._compile_timeout
        )
        if sc.returncode != 0:
            # parseia stderr com o regex existente → line, column, phase
            return self._parse_simplesc_error(sc.stderr)

        asm_text = asm_path.read_text(encoding='utf-8')

        # 2. nasm
        nasm = subprocess.run(
            ['nasm', '-f', 'elf32', str(asm_path), '-o', str(obj_path)],
            cwd=str(tmpdir), capture_output=True, timeout=self._compile_timeout
        )
        if nasm.returncode != 0:
            return CompileResult(
                success=False,
                error=nasm.stderr.decode('utf-8', errors='replace').strip(),
                phase='nasm'
            )

        # 3. linker
        ld = subprocess.run(
            ['i686-linux-gnu-ld', '-m', 'elf_i386', str(obj_path), '-o', str(bin_path)],
            cwd=str(tmpdir), capture_output=True, timeout=self._compile_timeout
        )
        if ld.returncode != 0:
            return CompileResult(
                success=False,
                error=ld.stderr.decode('utf-8', errors='replace').strip(),
                phase='ld'
            )

        return CompileResult(success=True, asm=asm_text)

    except subprocess.TimeoutExpired:
        return CompileResult(success=False, error='Compilation timed out', phase='compiler')
    finally:
        if tmpdir.exists():
            shutil.rmtree(tmpdir)
```

**Nota:** Para erros de `nasm` e `ld`, o campo `asm` **não** é retornado — o painel NASM exibe apenas o stderr do toolchain no estado `infra-error`. Isso simplifica o contrato e evita que o usuário confunda "ASM gerado com sucesso" com "pipeline falhou".

### Contrato do payload JSON (resposta do endpoint)

| Cenário | HTTP | Corpo |
|---|---|---|
| Sucesso completo | 200 | `{"asm": "..."}` |
| Erro simplesc | 400 | `{"error": "msg", "line": N, "column": N, "phase": "lexer\|parser\|semantic"}` |
| Erro nasm | 400 | `{"error": "stderr bruto", "phase": "nasm"}` |
| Erro ld | 400 | `{"error": "stderr bruto", "phase": "ld"}` |
| Código inválido/grande | 400/413 | `{"error": "msg", "phase": "validation"}` |
| Timeout | 408 | `{"error": "Compilation timed out"}` |

**Discriminador de UX:** o frontend usa `phase` para decidir o comportamento:
- `phase ∈ {lexer, parser, semantic}` → **Monaco markers** na linha/coluna indicadas
- `phase ∈ {nasm, ld}` → **comportamento híbrido** (ver Issue #20)
- `phase === validation` ou ausente → toast/banner genérico

---

## Issue #19 — Painel Visualizador NASM

### Componente `NasmPanel`

Novo componente React `frontend/src/components/NasmPanel.tsx`.

**Props:**

```ts
interface NasmPanelProps {
  state: 'idle' | 'compiling' | 'success' | 'infra-error'
  asm?: string         // conteúdo do .asm (state=success)
  errorLog?: string    // stderr bruto do nasm/ld (state=infra-error)
}
```

**Estados visuais:**

| `state` | O que o painel exibe |
|---|---|
| `idle` | Texto placeholder: *"Compile seu código para ver o assembly gerado"* |
| `compiling` | Spinner ou texto *"Compilando..."* (sem Monaco, só UI leve) |
| `success` | Monaco read-only com `language="asm"` (ou `plaintext` fallback), conteúdo = `asm` |
| `infra-error` | Monaco read-only com o `errorLog` em estilo terminal avermelhado |

**Integração com o layout:** usa o `react-resizable-panels` já instalado. O painel NASM ocupa a coluna direita; double-click no splitter colapsa/restaura (comportamento descrito no PRD §12.1).

### Monaco para NASM

Usar `language="asm"` se disponível no Monaco. Caso não exista built-in para x86, usar `language="plaintext"` — o NASM não precisa de highlight elaborado para a v1.

### Ciclo de atualização

O `NasmPanel` é **controlado** — não tem estado interno. O componente pai (`index.tsx` ou o hook de compilação) controla a prop `state` e `asm`. A transição é:

```
idle → compiling (ao clicar Run)
compiling → success (ao receber asm da API)
compiling → infra-error (ao receber phase=nasm|ld)
success|infra-error → compiling (ao clicar Run novamente)
```

---

## Issue #20 — Markers de Erro no Editor

### Comportamento por `phase`

#### Fases `lexer | parser | semantic` (erro no código do usuário)

```ts
monaco.editor.setModelMarkers(model, 'simplesc', [{
  severity: monaco.MarkerSeverity.Error,
  startLineNumber: err.line,
  endLineNumber: err.line,
  startColumn: err.column,
  endColumn: err.column + 1,
  message: err.message,
}])
```

O editor SIMPLES permanece editável. O painel NASM não é tocado (mantém estado anterior ou idle).

#### Fases `nasm | ld` (erro de infraestrutura)

1. **NÃO** criar markers no editor Monaco SIMPLES.
2. Limpar markers existentes: `monaco.editor.setModelMarkers(model, 'simplesc', [])`.
3. Atualizar `NasmPanel` para `state='infra-error'` com `errorLog=err.error`.
4. Exibir toast/banner: *"Erro de Infraestrutura: Falha na montagem/ligação do binário. Verifique o painel NASM para detalhes."*

#### Ao iniciar nova compilação

Limpar markers: `monaco.editor.setModelMarkers(model, 'simplesc', [])`.

### Extensão da prop `SimplesEditor`

Adicionar prop `markers` ao componente para receber e aplicar markers de fora, mantendo o `SimplesEditor` como componente controlado:

```ts
interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  markers?: CompileMarker[]   // novo
}

interface CompileMarker {
  line: number
  column: number
  message: string
}
```

O `useEffect` interno aplica `monaco.editor.setModelMarkers` sempre que `markers` mudar.

---

## Fluxo de dados end-to-end (Sprint 2)

```
[Usuário clica Run]
  → frontend limpa markers
  → frontend seta NasmPanel para state=compiling
  → POST /api/compile { code }
    ↓
  [backend: simplesc → nasm → ld]
    ↓
  Sucesso → { asm }
    → NasmPanel state=success, asm=<conteúdo>
    → editor markers=[]

  Erro simplesc → { error, line, column, phase:"lexer|parser|semantic" }
    → NasmPanel state=idle (não muda)
    → editor markers=[{line, column, message}]

  Erro nasm/ld → { error, phase:"nasm"|"ld" }
    → NasmPanel state=infra-error, errorLog=error
    → editor markers=[] (limpa, não adiciona)
    → toast: "Erro de Infraestrutura..."
```

---

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `frontend/src/components/SimplesEditor.tsx` | +regra `//` comment, +prop `markers`, +`useEffect` para `setModelMarkers` |
| `frontend/src/lib/simples-lang.ts` | sem mudança (keywords já completas) |
| `frontend/src/components/NasmPanel.tsx` | **novo** componente |
| `frontend/src/routes/index.tsx` | integrar `NasmPanel`, lógica de estado de compilação, toast |
| `backend/app/services/compiler.py` | +método `compile_full()` com nasm + ld |
| `backend/app/routes/compile.py` | chamar `compile_full()` em vez de `compile()` |
| `backend/tests/test_compiler_service.py` | +testes para `compile_full()` |
| `backend/tests/test_compile_route.py` | +testes para erros `phase=nasm|ld` |
