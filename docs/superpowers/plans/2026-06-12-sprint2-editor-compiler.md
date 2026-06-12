# Sprint 2 — Editor & Compilador: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar as quatro issues pendentes da Sprint 2: tokenizer com comentários (#15), pipeline nasm+ld no backend (#18), painel NASM no frontend (#19) e markers de erro no editor (#20).

**Architecture:** O backend ganha `compile_full()` que roda `simplesc → nasm → i686-linux-gnu-ld` em sequência num tmpdir único, retornando um payload JSON com o campo `phase` como discriminador (`lexer|parser|semantic` para erros do usuário; `nasm|ld` para erros de infraestrutura). O frontend usa esse discriminador para separar markers Monaco de uma banner de infraestrutura, e um novo `NasmPanel` exibe o assembly gerado.

**Tech Stack:** Python/Flask/pytest (backend), React 18/TypeScript/Tailwind/`@monaco-editor/react`/`react-resizable-panels` (frontend). Sem Vitest instalado — validação frontend é via execução do app.

---

## Mapa de arquivos

| Arquivo | Ação | Responsabilidade |
|---|---|---|
| `backend/app/services/compiler.py` | Modificar | + `_parse_simplesc_stderr()` helper + `compile_full()` |
| `backend/app/routes/compile.py` | Modificar | Chamar `compile_full()`, resposta condicional sem `line`/`column` para nasm/ld |
| `backend/tests/test_compiler_service.py` | Modificar | + `TestCompilerServiceFull` com 4 cenários |
| `backend/tests/test_compile_route.py` | Modificar | Atualizar mocks de `compile` → `compile_full`; + testes nasm/ld |
| `frontend/src/components/SimplesEditor.tsx` | Modificar | + regra `//` comment; + prop `markers`; + `onMount` ref; + `useEffect` markers |
| `frontend/src/components/NasmPanel.tsx` | Criar | Componente controlado com 4 estados visuais |
| `frontend/src/routes/index.tsx` | Modificar | Máquina de estados de compilação, chamada REST, integração panels |

---

## Task 1: Backend — extrair `_parse_simplesc_stderr` e implementar `compile_full()`

**Files:**
- Modify: `backend/app/services/compiler.py`
- Test: `backend/tests/test_compiler_service.py`

- [ ] **Step 1.1: Escrever os testes falhantes para `compile_full()`**

Adicionar a classe `TestCompilerServiceFull` ao final de `backend/tests/test_compiler_service.py`:

```python
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
```

- [ ] **Step 1.2: Rodar os testes para confirmar que falham**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest tests/test_compiler_service.py::TestCompilerServiceFull -v
```

Esperado: `AttributeError: 'CompilerService' object has no attribute 'compile_full'` (4 falhas)

- [ ] **Step 1.3: Implementar `_parse_simplesc_stderr` e `compile_full` em `compiler.py`**

Adicionar os dois métodos ao final da classe `CompilerService`, **antes** do fechamento da classe (após o método `compile` existente). Não alterar o método `compile` existente.

```python
    def _parse_simplesc_stderr(self, stderr: bytes) -> 'CompileResult':
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

    def compile_full(self, code: str) -> 'CompileResult':
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
                return self._parse_simplesc_stderr(sc.stderr)
            if not asm_path.exists():
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
                return CompileResult(
                    success=False,
                    error=ld.stderr.decode('utf-8', errors='replace').strip() or 'ld failed',
                    phase='ld',
                )

            return CompileResult(success=True, asm=asm_text)

        except subprocess.TimeoutExpired:
            return CompileResult(success=False, error='Compilation timed out', phase='compiler')
        finally:
            if tmpdir is not None and tmpdir.exists():
                shutil.rmtree(tmpdir)
```

- [ ] **Step 1.4: Rodar os testes para confirmar que passam**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest tests/test_compiler_service.py -v
```

Esperado: todos os testes `PASSED` (os 6 existentes + 4 novos = 10 total).

- [ ] **Step 1.5: Commit**

```bash
git add backend/app/services/compiler.py backend/tests/test_compiler_service.py
git commit -m "feat(backend): add compile_full() with nasm and ld pipeline (#18)"
```

---

## Task 2: Backend — atualizar rota para usar `compile_full()` e refinar resposta

**Files:**
- Modify: `backend/app/routes/compile.py`
- Modify: `backend/tests/test_compile_route.py`

- [ ] **Step 2.1: Escrever testes falhantes para novos comportamentos da rota**

Adicionar ao final da classe `TestCompileRoute` em `backend/tests/test_compile_route.py`:

```python
    def test_compile_full_nasm_error_no_line_column(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error='output.asm:5: error: invalid combination of opcode and operands',
                phase='nasm',
            )
            resp = client.post(
                '/api/compile',
                json={'code': 'programa x\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['phase'] == 'nasm'
            assert 'line' not in data
            assert 'column' not in data
            assert 'invalid combination' in data['error']

    def test_compile_full_ld_error_no_line_column(self, app, client, mock_auth):
        with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
            mock_compile.return_value = CompileResult(
                success=False,
                error="output.o: undefined reference to `_start'",
                phase='ld',
            )
            resp = client.post(
                '/api/compile',
                json={'code': 'programa x\ninicio\nfim\n'},
                headers={'Authorization': 'Bearer test-token'},
            )
            assert resp.status_code == 400
            data = resp.get_json()
            assert data['phase'] == 'ld'
            assert 'line' not in data
            assert 'column' not in data
```

- [ ] **Step 2.2: Rodar para confirmar falha esperada**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest tests/test_compile_route.py::TestCompileRoute::test_compile_full_nasm_error_no_line_column tests/test_compile_route.py::TestCompileRoute::test_compile_full_ld_error_no_line_column -v
```

Esperado: os 2 novos testes FAILED (rota ainda chama `compile()`, que não corresponde ao mock de `compile_full()`).

- [ ] **Step 2.3: Atualizar `compile.py` — trocar `compile()` por `compile_full()` e refinar resposta**

Substituir o conteúdo de `backend/app/routes/compile.py` por:

```python
import structlog
from flask import Blueprint, jsonify, request

from app.middleware.auth import require_auth
from app.services.compiler import CompilerService

bp = Blueprint('compile', __name__, url_prefix='/api')
logger = structlog.get_logger()
compiler = CompilerService()

SIMPLESC_PHASES = {'lexer', 'parser', 'semantic'}


@bp.route('/compile', methods=['POST'])
@require_auth
def handle_compile():
    data = request.get_json()
    if not data or 'code' not in data:
        return jsonify({'error': 'Missing required field: code'}), 400

    code = data['code']
    if not isinstance(code, str):
        return jsonify({'error': 'Field code must be a string'}), 400

    result = compiler.compile_full(code)

    if result.success:
        logger.info('compile_success', code_size=len(code))
        return jsonify({'asm': result.asm}), 200

    if result.phase == 'validation':
        logger.warning('compile_validation_error', error=result.error, code_size=len(code))
        status = 413 if 'exceeds maximum size' in result.error else 400
        return jsonify({'error': result.error}), status

    if result.error == 'Compilation timed out':
        logger.warning('compile_timeout', code_size=len(code))
        return jsonify({'error': result.error}), 408

    logger.warning('compile_error', phase=result.phase, line=result.line, error=result.error)
    response: dict = {'error': result.error, 'phase': result.phase}
    if result.line is not None:
        response['line'] = result.line
    if result.column is not None:
        response['column'] = result.column
    return jsonify(response), 400
```

- [ ] **Step 2.4: Atualizar os mocks dos testes existentes de `test_compile_route.py`**

Os testes `test_compile_success`, `test_compile_error_response`, `test_compile_validation_size_error`, `test_compile_validation_utf8_error`, `test_compile_timeout` atualmente mockam `CompilerService.compile`. Trocar todos os `CompilerService.compile` por `CompilerService.compile_full` nesses testes. Exemplo — alterar:

```python
# ANTES
with patch('app.routes.compile.CompilerService.compile') as mock_compile:
# DEPOIS
with patch('app.routes.compile.CompilerService.compile_full') as mock_compile:
```

Fazer essa substituição em todos os 5 testes que usam esse patch.

- [ ] **Step 2.5: Rodar toda a suite de rotas**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest tests/test_compile_route.py -v
```

Esperado: todos os testes PASSED (os existentes atualizados + 2 novos = 9 total).

- [ ] **Step 2.6: Rodar suite completa do backend**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest -v
```

Esperado: todos PASSED.

- [ ] **Step 2.7: Commit**

```bash
git add backend/app/routes/compile.py backend/tests/test_compile_route.py
git commit -m "feat(backend): route calls compile_full(), response omits line/column for nasm/ld (#18)"
```

---

## Task 3: Frontend — adicionar regra de comentário `//` ao tokenizer (#15) e instalar `react-resizable-panels`

**Files:**
- Modify: `frontend/src/components/SimplesEditor.tsx`
- Modify: `frontend/package.json` (via npm install)

- [ ] **Step 3.1: Instalar `react-resizable-panels`**

```bash
cd /home/carol/Simples-editor/frontend
npm install react-resizable-panels
```

Esperado: pacote adicionado ao `package.json` e `package-lock.json`.

- [ ] **Step 3.2: Adicionar regra de comentário ao tokenizer em `SimplesEditor.tsx`**

No array `tokenizer.root` dentro de `handleBeforeMount`, adicionar a regra de comentário como **primeira entrada** (antes da regra de identificador):

Localizar o bloco:
```ts
      tokenizer: {
        root: [
          [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
```

Alterar para:
```ts
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/[a-zA-Z_]\w*/, { cases: { '@keywords': 'keyword', '@default': 'identifier' } }],
```

O token `comment` já está mapeado para verde (`66bb6a`) no tema `simples-dark` — nenhuma outra alteração necessária.

- [ ] **Step 3.3: Verificar TypeScript**

```bash
cd /home/carol/Simples-editor/frontend
npm run build 2>&1 | head -30
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 3.4: Commit**

```bash
git add frontend/src/components/SimplesEditor.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat(editor): add // comment tokenizer rule to Monaco SIMPLES language (#15)"
```

---

## Task 4: Frontend — adicionar prop `markers` ao `SimplesEditor` (#20)

**Files:**
- Modify: `frontend/src/components/SimplesEditor.tsx`

- [ ] **Step 4.1: Adicionar imports necessários no topo de `SimplesEditor.tsx`**

Substituir as **duas** linhas de import atuais:
```ts
import Editor, { BeforeMount } from '@monaco-editor/react'
import { SIMPLES_KEYWORDS, SIMPLES_OPERATORS } from '../lib/simples-lang'
```

Por:
```ts
import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react'
import { useEffect, useRef } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { SIMPLES_KEYWORDS, SIMPLES_OPERATORS } from '../lib/simples-lang'
```

- [ ] **Step 4.2: Exportar o tipo `CompileMarker` e atualizar a interface de props**

Após os imports, adicionar o tipo e atualizar a interface:

```ts
export interface CompileMarker {
  line: number
  column: number
  message: string
}

interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  markers?: CompileMarker[]
}
```

- [ ] **Step 4.3: Adicionar refs e handlers dentro da função `SimplesEditor`**

Dentro da função, antes de `handleBeforeMount`, adicionar:

```ts
  const monacoRef = useRef<Monaco | null>(null)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleMount: OnMount = (ed, monaco) => {
    editorRef.current = ed
    monacoRef.current = monaco
  }

  useEffect(() => {
    const monaco = monacoRef.current
    const ed = editorRef.current
    if (!monaco || !ed) return
    const model = ed.getModel()
    if (!model) return
    monaco.editor.setModelMarkers(
      model,
      'simplesc',
      (markers ?? []).map((m) => ({
        severity: monaco.MarkerSeverity.Error,
        startLineNumber: m.line,
        endLineNumber: m.line,
        startColumn: m.column,
        endColumn: m.column + 1,
        message: m.message,
      }))
    )
  }, [markers])
```

- [ ] **Step 4.4: Adicionar `onMount={handleMount}` no componente `<Editor>`**

Localizar a prop `beforeMount={handleBeforeMount}` no `<Editor>` e adicionar logo após:

```tsx
      beforeMount={handleBeforeMount}
      onMount={handleMount}
```

- [ ] **Step 4.5: Verificar TypeScript**

```bash
cd /home/carol/Simples-editor/frontend
npm run build 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 4.6: Commit**

```bash
git add frontend/src/components/SimplesEditor.tsx
git commit -m "feat(editor): add markers prop for compile error highlighting (#20)"
```

---

## Task 5: Frontend — criar componente `NasmPanel` (#19)

**Files:**
- Create: `frontend/src/components/NasmPanel.tsx`

- [ ] **Step 5.1: Criar `NasmPanel.tsx`**

Criar o arquivo `frontend/src/components/NasmPanel.tsx` com o conteúdo:

```tsx
import Editor from '@monaco-editor/react'

interface NasmPanelProps {
  state: 'idle' | 'compiling' | 'success' | 'infra-error'
  asm?: string
  errorLog?: string
}

export function NasmPanel({ state, asm, errorLog }: NasmPanelProps) {
  if (state === 'idle') {
    return (
      <div className="flex items-center justify-center h-full text-gray-500 text-sm px-4 text-center">
        Compile seu código para ver o assembly gerado
      </div>
    )
  }

  if (state === 'compiling') {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm gap-2">
        <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
        Compilando...
      </div>
    )
  }

  if (state === 'infra-error') {
    return (
      <pre className="h-full overflow-auto p-4 text-red-400 text-xs font-mono bg-[#1a1a2e] whitespace-pre-wrap break-words">
        {errorLog ?? 'Erro desconhecido no toolchain'}
      </pre>
    )
  }

  return (
    <Editor
      height="100%"
      language="plaintext"
      theme="simples-dark"
      value={asm ?? ''}
      options={{
        readOnly: true,
        minimap: { enabled: false },
        fontSize: 13,
        padding: { top: 12 },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'off',
      }}
    />
  )
}
```

- [ ] **Step 5.2: Verificar TypeScript**

```bash
cd /home/carol/Simples-editor/frontend
npm run build 2>&1 | head -30
```

Esperado: sem erros.

- [ ] **Step 5.3: Commit**

```bash
git add frontend/src/components/NasmPanel.tsx
git commit -m "feat(frontend): add NasmPanel component with 4 visual states (#19)"
```

---

## Task 6: Frontend — integrar tudo em `index.tsx` com máquina de estados

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 6.1: Substituir o conteúdo de `index.tsx`**

Substituir todo o conteúdo do arquivo por:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels'
import { SimplesEditor, type CompileMarker } from '../components/SimplesEditor'
import { NasmPanel } from '../components/NasmPanel'
import { useAuth } from '../lib/auth'

export const Route = createFileRoute('/')({
  component: Index,
})

type NasmState = 'idle' | 'compiling' | 'success' | 'infra-error'

const SIMPLESC_PHASES = new Set(['lexer', 'parser', 'semantic'])

function Index() {
  const { session } = useAuth()
  const [code, setCode] = useState('')
  const [isCompiling, setIsCompiling] = useState(false)
  const [nasmState, setNasmState] = useState<NasmState>('idle')
  const [nasmAsm, setNasmAsm] = useState('')
  const [nasmErrorLog, setNasmErrorLog] = useState('')
  const [markers, setMarkers] = useState<CompileMarker[]>([])
  const [infraError, setInfraError] = useState<string | null>(null)

  async function handleRun() {
    if (!session || isCompiling) return

    setIsCompiling(true)
    setNasmState('compiling')
    setMarkers([])
    setInfraError(null)

    try {
      const resp = await fetch('/api/compile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ code }),
      })

      const data: {
        asm?: string
        error?: string
        phase?: string
        line?: number
        column?: number
      } = await resp.json()

      if (resp.ok && data.asm) {
        setNasmAsm(data.asm)
        setNasmState('success')
      } else {
        const phase = data.phase ?? ''

        if (SIMPLESC_PHASES.has(phase) && data.line != null && data.column != null) {
          setMarkers([{ line: data.line, column: data.column, message: data.error ?? '' }])
          setNasmState('idle')
        } else if (phase === 'nasm' || phase === 'ld') {
          const action = phase === 'nasm' ? 'montagem' : 'ligação'
          setNasmErrorLog(data.error ?? 'Erro desconhecido')
          setNasmState('infra-error')
          setInfraError(
            `Erro de Infraestrutura: Falha na ${action} do binário. Verifique o painel NASM para detalhes.`,
          )
        } else {
          setInfraError(data.error ?? 'Erro desconhecido ao compilar.')
          setNasmState('idle')
        }
      }
    } catch {
      setInfraError('Erro de rede ao contactar o servidor.')
      setNasmState('idle')
    } finally {
      setIsCompiling(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460]">
        <button
          onClick={handleRun}
          disabled={isCompiling || !session}
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {isCompiling ? 'Compilando...' : '▶ Run'}
        </button>
      </div>

      {/* Infra error banner */}
      {infraError && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-900/40 border-b border-red-700 text-red-300 text-sm">
          <span>⚠ {infraError}</span>
          <button
            onClick={() => setInfraError(null)}
            className="ml-auto text-red-400 hover:text-red-200 leading-none"
            aria-label="Fechar aviso"
          >
            ✕
          </button>
        </div>
      )}

      {/* Editor + NASM panels */}
      <PanelGroup direction="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={55} minSize={25}>
          <SimplesEditor
            value={code}
            onChange={setCode}
            readOnly={isCompiling}
            markers={markers}
          />
        </Panel>
        <PanelResizeHandle className="w-1 bg-[#0f3460] hover:bg-cyan-700 transition-colors cursor-col-resize" />
        <Panel defaultSize={45} minSize={20}>
          <NasmPanel state={nasmState} asm={nasmAsm} errorLog={nasmErrorLog} />
        </Panel>
      </PanelGroup>
    </div>
  )
}
```

- [ ] **Step 6.2: Verificar TypeScript**

```bash
cd /home/carol/Simples-editor/frontend
npm run build 2>&1 | head -40
```

Esperado: build sem erros de TypeScript.

- [ ] **Step 6.3: Subir o servidor de desenvolvimento e testar manualmente**

```bash
cd /home/carol/Simples-editor/frontend
npm run dev
```

Abrir `http://localhost:5173` (ou a porta que o Vite exibir). Verificar:

1. **Layout**: editor Monaco ocupa ~55% da largura, painel NASM ocupa ~45%. Splitter arrastável entre eles.
2. **Comentários (#15)**: digitar `// isso é um comentário` no editor → texto deve ficar verde.
3. **Keywords (#15)**: digitar `programa`, `inicio`, `fim` → devem ficar em ciano.
4. **Estado idle do NASM**: painel direito exibe "Compile seu código para ver o assembly gerado".
5. **Run sem autenticação**: botão Run desabilitado se não logado.

- [ ] **Step 6.4: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "feat(frontend): wire IDE layout with NasmPanel, compile state machine, infra banner (#19 #20)"
```

---

## Task 7: Teste integrado do fluxo completo (validação manual)

*Esta task não tem testes automatizados — requer o backend rodando com `simplesc` e `nasm` instalados, ou o Docker Compose.*

- [ ] **Step 7.1: Confirmar suite backend completa**

```bash
cd /home/carol/Simples-editor/backend
python -m pytest -v
```

Esperado: todos PASSED.

- [ ] **Step 7.2: Testar fluxo de sucesso no Docker Compose** *(se o ambiente estiver disponível)*

Subir os serviços e compilar o exemplo canônico de fatorial:

```
programa fatorial
  inteiro n, fat, contador
inicio
  leia n
  fat <- 1
  contador <- 1
  enquanto contador < n faca
    contador <- contador + 1
    fat <- fat * contador
  fimenquanto
  escreva fat
fim
```

Resultado esperado:
- Painel NASM exibe o `.asm` gerado.
- Nenhum marker no editor.
- Nenhuma banner de erro.

- [ ] **Step 7.3: Testar fluxo de erro `lexer` (marker no editor)**

Digitar `programa x\ninicio\n  @\nfim\n` e clicar Run.

Resultado esperado:
- Monaco exibe sublinhado vermelho na linha 3.
- Hover sobre o sublinhado exibe a mensagem de erro.
- Painel NASM permanece em estado anterior (idle ou último sucesso).
- Nenhuma banner de infra.

- [ ] **Step 7.4: Commit final da sprint**

```bash
git add .
git status  # confirmar que não há arquivos inesperados
git commit -m "chore: Sprint 2 complete — issues #15 #18 #19 #20 implemented"
```

---

## Resumo dos contratos finais

### Payload JSON do `POST /api/compile`

| Cenário | HTTP | Corpo |
|---|---|---|
| Sucesso | 200 | `{"asm": "..."}` |
| Erro simplesc | 400 | `{"error": "msg", "line": N, "column": N, "phase": "lexer\|parser\|semantic"}` |
| Erro nasm | 400 | `{"error": "stderr bruto", "phase": "nasm"}` |
| Erro ld | 400 | `{"error": "stderr bruto", "phase": "ld"}` |
| Validação (tamanho/UTF-8) | 400 ou 413 | `{"error": "msg"}` |
| Timeout | 408 | `{"error": "Compilation timed out"}` |

### Props do `SimplesEditor`

```ts
interface SimplesEditorProps {
  value: string
  onChange: (value: string) => void
  readOnly?: boolean
  markers?: CompileMarker[]   // [] limpa, undefined = sem mudança
}
export interface CompileMarker { line: number; column: number; message: string }
```

### Props do `NasmPanel`

```ts
interface NasmPanelProps {
  state: 'idle' | 'compiling' | 'success' | 'infra-error'
  asm?: string       // usado quando state='success'
  errorLog?: string  // usado quando state='infra-error'
}
```
