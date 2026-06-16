# Design — Sprint 3: Execução em Sandbox + Terminal WebSocket

> **Sessão de brainstorming:** 2026-06-15
> **Escopo:** Issues #21 a #27 do Simples Editor
> **Fontes:** `sprint-3-execution-prd.md`, `prd-simples-online.md`, `PROGRESS.md`

---

## Decisões Arquiteturais

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| WebSocket library | `flask-sock` (já instalado) | Leve, raw WebSocket, já no projeto. Suficiente para protocolo terminal (7 tipos de mensagem). |
| Sandbox | `docker run --rm` descartável | Container novo por execução, destruído ao sair. Isolamento total, sem estado residual. |
| Timeout | 3-layer | Wall-clock (10s async), processo (SIGTERM+1s+SIGKILL), container (`--stop-timeout=2` safety net). |
| Estado frontend | Custom hook + useReducer | Pattern similar a `useAuth()`. Sem dependências extras. Estados: idle/connecting/running/stopping/finished/error/timeout. |
| Terminal UI | `xterm.js` v5 | Terminal padrão web. Fundo preto, fonte monospace, input/output via WebSocket. |

---

## Issue #21 — WebSocket Endpoint `/ws/run`

### Arquivo: `backend/app/routes/execution.py`

Rota WebSocket registrada via `flask-sock`:

```python
from flask_sock import Sock
sock = Sock()

@sock.route('/ws/run')
def execution_ws(ws):
    token = request.args.get('token')
    claims = validate_jwt(token)  # middleware auth adaptado
    if not claims:
        ws.close(4001, "Unauthorized")
        return

    strategy = PtyExecutionStrategy()
    for msg in ws:
        data = json.loads(msg)
        if data['type'] == 'execute':
            strategy.spawn(ws)
        elif data['type'] == 'input':
            strategy.write(data['data'])
        elif data['type'] == 'stop':
            strategy.terminate(ws)
```

- JWT validado no handshake (query param `token`). Close code 4001 = auth failure.
- Loop síncrono (gevent cooperativo): `for msg in ws` bloqueia sem travar outras conexões.
- Strategy roda output em greenlet separado (`gevent.spawn`).

### Registro no `__init__.py`

```python
from backend.app.routes.execution import sock, execution_bp
app.register_blueprint(execution_bp)
sock.init_app(app)
```

---

## Issue #22 + #23 — Sandbox Runner + PtyExecutionStrategy

### Arquivo: `backend/app/strategies/execution.py`

```python
class PtyExecutionStrategy:
    TIMEOUT_SECONDS = 10

    def __init__(self):
        self.container = None
        self.process = None
        self.tmpdir = None

    def spawn(self, ws, binary_session_key):
        self.tmpdir = tempfile.mkdtemp()
        binary_path = session_binary_map[binary_session_key]
        shutil.copy(binary_path, f"{self.tmpdir}/prog")
        os.chmod(f"{self.tmpdir}/prog", 0o755)

        client = docker.from_env()
        self.container = client.containers.run(
            image='simples-runner:latest',
            command='./prog',
            volumes={self.tmpdir: {'bind': '/sandbox', 'mode': 'ro'}},
            working_dir='/sandbox',
            remove=True,
            read_only=True,
            network_mode='none',
            mem_limit='64m',
            nano_cpus=500_000_000,  # 0.5 CPU
            user='65534:65534',
            pids_limit=32,
            stop_timeout=2,
            detach=True,
            stdin_open=True,
            stdout=True,
            stderr=True,
        )
        # Attach to container for streaming
        socket = self.container.attach_socket(params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
        self._stream_output(ws, socket)

    def _stream_output(self, ws, socket):
        timeout_event = gevent.event.Event()
        gevent.spawn_later(self.TIMEOUT_SECONDS, timeout_event.set)

        while not timeout_event.is_set():
            data = socket._sock.recv(4096)
            if not data:
                break
            # docker multiplex: 8-byte header (stream=1 stdout, stream=2 stderr)
            header = data[:8]
            stream_type = header[0]
            payload = data[8:]
            if stream_type == 1:  # stdout
                ws.send(json.dumps({"type": "output", "data": payload.decode('utf-8', errors='replace')}))
            elif stream_type == 2:  # stderr
                ws.send(json.dumps({"type": "error", "data": payload.decode('utf-8', errors='replace')}))

        if timeout_event.is_set():
            ws.send(json.dumps({"type": "timeout"}))
            self._force_kill(ws)
        else:
            exit_code = self.container.wait()['StatusCode']
            ws.send(json.dumps({"type": "exit", "code": exit_code}))

        self.cleanup()

    def write(self, data):
        socket = self.container.attach_socket(params={'stdin': 1, 'stream': 1})
        socket._sock.send(data.encode('utf-8'))

    def terminate(self, ws):
        self.container.kill(signal='SIGTERM')
        gevent.sleep(1)
        try:
            self.container.kill(signal='SIGKILL')
        except docker.errors.APIError:
            pass  # já morreu
        ws.send(json.dumps({"type": "exit", "code": -1}))

    def _force_kill(self, ws):
        self.container.kill(signal='SIGTERM')
        gevent.sleep(1)
        try:
            self.container.kill(signal='SIGKILL')
        except docker.errors.APIError:
            pass

    def cleanup(self):
        if self.tmpdir and os.path.exists(self.tmpdir):
            shutil.rmtree(self.tmpdir)
```

### Container Flags (8 flags de segurança)

```
docker run --rm --read-only --network=none \
  --memory=64m --cpus=0.5 --user=65534:65534 \
  --pids-limit=32 --stop-timeout=2 \
  -v /tmpdir:/sandbox:ro \
  simples-runner:latest ./prog
```

### Imagem Runner (`runner/Dockerfile`)

Já existe. Base `debian:12-slim`, `qemu-user-static`, usuário `nobody:nobody`, diretório `/sandbox`. Nenhuma alteração necessária.

---

## Issue #24 — Timeout Handling (3-layer)

| Layer | Mecanismo | Gatilho | Ação |
|-------|-----------|---------|------|
| 1 — Wall-clock | `gevent.spawn_later(10s)` | 10s após spawn | Envia `{"type":"timeout"}`, chama `_force_kill()` |
| 2 — Processo | `container.kill('SIGTERM')` + `gevent.sleep(1)` + `container.kill('SIGKILL')` | Stop button OU layer 1 | Graceful → force kill |
| 3 — Container | `--stop-timeout=2` | Docker engine | Safety net se processo ignorar sinais |

### Comportamento esperado por cenário

| Cenário | Timeout? | Exit code | Mensagem WS |
|---------|----------|-----------|-------------|
| Programa termina em <10s | Não | 0 a 255 | `{"type":"exit","code":N}` |
| Loop infinito | Sim (10s) | -1 | `{"type":"timeout"}` então `{"type":"exit","code":-1}` |
| Usuário clica Stop | Não (manual) | -1 | `{"type":"exit","code":-1}` |
| Segfault | Não | 139 | `{"type":"exit","code":139}` |

---

## Issue #25 — Terminal xterm.js

### Arquivo: `frontend/src/components/Terminal.tsx`

```tsx
interface TerminalProps {
  onInput: (data: string) => void
  onOutput: (callback: (data: string) => void) => void  // registra callback de output
}

export function Terminal({ onInput, onOutput }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<Terminal | null>(null)

  useEffect(() => {
    const term = new Terminal({
      theme: { background: '#000000', foreground: '#f0f0f0' },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      cursorBlink: true,
      cols: 80,
      rows: 12,
    })
    term.open(terminalRef.current!)
    xtermRef.current = term

    onOutput((data: string) => term.write(data))

    return () => { term.dispose() }
  }, [])

  useEffect(() => {
    const dispose = xtermRef.current?.onData(onInput)
    return () => dispose?.dispose()
  }, [onInput])

  return <div ref={terminalRef} className="h-full" />
}
```

- Tema escuro (fundo `#000`, texto `#f0f0f0`).
- 80 colunas × 12 linhas.
- `onOutput` registra um callback chamado quando output chega via WebSocket.
- `onData` captura cada tecla digitada e envia como `{"type":"input","data":"..."}`.

### Dependência a adicionar

```bash
npm install @xterm/xterm
```

---

## Issue #26 — WebSocket Client State Machine

### Arquivo: `frontend/src/hooks/useExecution.ts`

```tsx
type ExecutionState = 'idle' | 'connecting' | 'running' | 'stopping' | 'finished' | 'error' | 'timeout'

type ExecutionAction =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'RUN' }
  | { type: 'STOP' }
  | { type: 'EXIT'; code: number }
  | { type: 'TIMEOUT' }
  | { type: 'ERROR'; message: string }
  | { type: 'DISCONNECT' }

interface ExecutionStateData {
  state: ExecutionState
  exitCode: number | null
  error: string | null
}

function executionReducer(s: ExecutionStateData, action: ExecutionAction): ExecutionStateData {
  switch (action.type) {
    case 'CONNECT':   return { state: 'connecting', exitCode: null, error: null }
    case 'CONNECTED': return { state: 'running', exitCode: null, error: null }
    case 'RUN':       return { state: 'running', exitCode: null, error: null }
    case 'STOP':      return { state: 'stopping', exitCode: null, error: null }
    case 'EXIT':      return { state: 'finished', exitCode: action.code, error: null }
    case 'TIMEOUT':   return { state: 'timeout', exitCode: -1, error: 'Timeout (10s)' }
    case 'ERROR':     return { state: 'error', exitCode: null, error: action.message }
    case 'DISCONNECT': return { state: 'idle', exitCode: null, error: null }
  }
}

interface ExecutionContext {
  state: ExecutionState
  exitCode: number | null
  error: string | null
  registerOutput: (callback: (data: string) => void) => void
  execute: () => void
  sendInput: (data: string) => void
  stop: () => void
}

export function useExecution(): ExecutionContext {
  const { session } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const outputCallbackRef = useRef<((data: string) => void) | null>(null)

  const [{ state, exitCode, error }, dispatch] = useReducer(executionReducer, {
    state: 'idle', exitCode: null, error: null
  })

  const registerOutput = useCallback((cb: (data: string) => void) => {
    outputCallbackRef.current = cb
  }, [])

  const connect = useCallback(() => {
    dispatch({ type: 'CONNECT' })
    const ws = new WebSocket(`ws://${window.location.host}/ws/run?token=${session.access_token}`)
    wsRef.current = ws

    ws.onopen = () => {
      dispatch({ type: 'CONNECTED' })
      ws.send(JSON.stringify({ type: 'execute' }))
      dispatch({ type: 'RUN' })
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      switch (msg.type) {
        case 'output': outputCallbackRef.current?.(msg.data); break
        case 'error': outputCallbackRef.current?.(`\x1b[31m${msg.data}\x1b[0m`); break
        case 'exit': dispatch({ type: 'EXIT', code: msg.code }); break
        case 'timeout': dispatch({ type: 'TIMEOUT' }); break
      }
    }
    ws.onerror = () => dispatch({ type: 'ERROR', message: 'Connection error' })
    ws.onclose = () => dispatch({ type: 'DISCONNECT' })
  }, [session])

  const execute = () => connect()
  const sendInput = (data: string) => { wsRef.current?.send(JSON.stringify({ type: 'input', data })) }
  const stop = () => { wsRef.current?.send(JSON.stringify({ type: 'stop' })); dispatch({ type: 'STOP' }) }

  return { state, exitCode, error, registerOutput, execute, sendInput, stop }
}
```

### Transições da máquina de estados

```
IDLE ──CONNECT──▶ CONNECTING ──CONNECTED──▶ RUNNING
                      │                        │
                      ▼                        ▼ STOP
                   ERROR                   STOPPING
                                              │
                                    ┌─────────┼─────────┐
                                    ▼         ▼         ▼
                                 EXIT(0)   EXIT(!=0)  TIMEOUT
                                    │         │         │
                                    └─────────┴─────────┘
                                              │
                                              ▼
                                         FINISHED/IDLE
```

---

## Issue #27 — Run e Stop Buttons + Layout 3 Painéis

### Modificações em `frontend/src/routes/index.tsx`

```tsx
export default function Index() {
  const { state, exitCode, error, registerOutput, execute, sendInput, stop } = useExecution()

  return (
    <div className="flex flex-col h-screen">
      {/* Toolbar: Run/Stop buttons */}
      <div className="flex gap-2 p-2 bg-gray-900 border-b border-gray-700">
        {state === 'idle' || state === 'finished' || state === 'error' || state === 'timeout' ? (
          <Button onClick={execute} variant="primary" icon={<PlayIcon />}>
            Run
          </Button>
        ) : state === 'running' ? (
          <Button onClick={stop} variant="destructive" icon={<StopIcon />}>
            Stop
          </Button>
        ) : (
          <Button disabled variant="ghost" icon={<Spinner />}>
            {state === 'connecting' ? 'Connecting...' : 'Stopping...'}
          </Button>
        )}
        {state === 'error' && error && (
          <span className="text-sm text-red-400">{error}</span>
        )}
        {state === 'finished' && exitCode !== null && (
          <span className={`text-sm ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
            Exit code: {exitCode}
          </span>
        )}
        {state === 'timeout' && (
          <span className="text-sm text-yellow-400">Timeout (10s)</span>
        )}
      </div>

      {/* 3 painéis: Editor | NASM | Terminal */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 border-r border-gray-700">
          <SimplesEditor /* ... props existentes ... */ />
        </div>
        <div className="flex-1 flex flex-col border-r border-gray-700">
          <NasmPanel /* ... props existentes ... */ />
        </div>
      </div>
      <div className="h-48 border-t border-gray-700">
        <Terminal onInput={sendInput} onOutput={registerOutput} />
      </div>
    </div>
  )
}
```

- Layout: 3 zonas — Editor + NASM lado a lado (topo), Terminal (base, altura ~200px).
- Botão Run visível em `idle`, `finished`, `error`, `timeout`.
- Botão Stop visível apenas em `running`.
- Spinner em `connecting` e `stopping`.
- Exit code exibido na toolbar após término.

---

## Contrato de Dados — WebSocket Protocol

| Direção | Tipo | Payload | Quando |
|---------|------|---------|--------|
| FE → BE | `execute` | `{}` | WebSocket aberto, inicia container |
| FE → BE | `input` | `{"data": "5\n"}` | Tecla digitada no terminal |
| FE → BE | `stop` | `{}` | Botão Stop |
| BE → FE | `output` | `{"data": "42\n"}` | stdout do container |
| BE → FE | `error` | `{"data": "..."}` | stderr ou erro de runtime |
| BE → FE | `exit` | `{"code": 0}` | Programa terminou |
| BE → FE | `timeout` | `{}` | Timeout de 10s estourou |

### Códigos de close

| Code | Significado |
|------|-------------|
| 4001 | JWT inválido ou expirado |
| 5000 | Docker indisponível / erro interno |

---

## Estratégia de Testes

### Backend — 8 testes (`backend/tests/test_execution_strategy.py`)

| # | Teste | Verifica |
|---|-------|---------|
| 1 | `test_spawn_with_echo` | Container spawna, captura stdout "hello" |
| 2 | `test_stdin_propagates` | `write("42\n")` → stdout contém "42" |
| 3 | `test_timeout_after_10s` | Programa `sleep 30` → timeout enviado |
| 4 | `test_sigterm_then_sigkill` | `terminate()` → SIGTERM → 1s → SIGKILL |
| 5 | `test_exit_code_captured` | `exit(42)` → `{"code": 42}` |
| 6 | `test_stderr_stream` | stderr separado de stdout |
| 7 | `test_container_cleanup` | Container removido + tmpdir deletado |
| 8 | `test_docker_flags` | Flags corretas (`--rm`, `--read-only`, `--network=none`, etc.) |

### Frontend — testes de integração

- Terminal renderiza instância xterm.js
- WebSocket conecta com JWT
- Output aparece em tempo real no terminal
- Input digitado → enviado ao backend
- Botão Stop envia `{"type":"stop"}`
- Conexão fecha limpa ao término

---

## Arquivos Afetados

### Novos (4)

| Arquivo | Propósito |
|---------|-----------|
| `backend/app/routes/execution.py` | Rota WebSocket `/ws/run` |
| `backend/app/strategies/execution.py` | `PtyExecutionStrategy` |
| `frontend/src/components/Terminal.tsx` | Terminal xterm.js |
| `frontend/src/hooks/useExecution.ts` | Hook useReducer WebSocket |

### Modificados (3)

| Arquivo | Mudança |
|---------|---------|
| `frontend/src/routes/index.tsx` | Layout 3 painéis + Run/Stop buttons |
| `backend/app/__init__.py` | Registrar `execution_bp` + `sock.init_app(app)` |
| `nginx/nginx.dev.conf` | Proxy `/ws/` → backend (verificar se já existe) |

### Dependências a adicionar

| Arquivo | Dependência |
|---------|------------|
| `frontend/package.json` | `@xterm/xterm` (já pode existir após PRDs anteriores) |

---

## Checklist de Implementação

- [ ] Adicionar `@xterm/xterm` ao `package.json` do frontend
- [ ] Criar `backend/tests/test_execution_strategy.py` (TDD: 8 testes falhando)
- [ ] Criar `backend/app/strategies/execution.py` (PtyExecutionStrategy)
- [ ] Criar `backend/app/routes/execution.py` (rota `/ws/run`)
- [ ] Registrar blueprint no `backend/app/__init__.py`
- [ ] Verificar `nginx/nginx.dev.conf` — proxy `/ws/` para backend
- [ ] Verificar runner Dockerfile — compilar se necessário
- [ ] Criar `frontend/src/hooks/useExecution.ts`
- [ ] Criar `frontend/src/components/Terminal.tsx`
- [ ] Modificar `frontend/src/routes/index.tsx` (layout + Run/Stop)
- [ ] Rodar testes: 23 (Sprint 2) + 8 (Sprint 3) = 31 PASSED
- [ ] Teste manual: echo, soma N, timeout

---

**Status:** Aprovado pelo brainstorming
**Próximo passo:** Planos de implementação via `writing-plans`
