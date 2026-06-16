# Sprint 3: Execução em Sandbox + Terminal WebSocket — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time code execution in sandboxed Docker containers with interactive xterm.js terminal via WebSocket.

**Architecture:** Backend WebSocket endpoint `/ws/run` (flask-sock + gevent) spawns Docker containers (`docker run --rm` disposable), streams stdout/stderr via PTY, accepts stdin. Frontend `Terminal.tsx` component (xterm.js) + `useExecution.ts` hook (useReducer state machine) + Run/Stop buttons in 3-panel layout.

**Tech Stack:** Flask + flask-sock + gevent + docker-py (backend); React 18 + xterm.js v5 + TanStack Router + Monaco Editor (frontend).

---

### Task 1: Install xterm.js Dependency

**Files:**
- Modify: `frontend/package.json`

- [ ] **Step 1: Install @xterm/xterm**

```bash
npm install -C frontend @xterm/xterm
```

Expected: `"@xterm/xterm": "^5.5.0"` (or similar) added to `package.json` dependencies, `node_modules` updated.

- [ ] **Step 2: Verify TypeScript still compiles**

```bash
npm run build -C frontend
```

Expected: Build succeeds (no new TS errors from the dependency).

- [ ] **Step 3: Commit**

```bash
git add frontend/package.json frontend/package-lock.json
git commit -m "chore(frontend): add @xterm/xterm dependency"
```

---

### Task 2: Backend TDD — Write Execution Strategy Tests

**Files:**
- Create: `backend/tests/test_execution_strategy.py`

- [ ] **Step 1: Create test file with 8 failing tests**

```python
import json
import os
import subprocess
import tempfile
from unittest.mock import MagicMock, Mock, patch

from app.strategies.execution import PtyExecutionStrategy


class TestPtyExecutionStrategy:
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_creates_tmpdir_and_container(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_socket._sock.recv.side_effect = [b'']
        mock_container.attach_socket.return_value = mock_socket
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.spawn(ws, binary_session_key='test_key')

        mock_mkdtemp.assert_called_once()
        mock_client.containers.run.assert_called_once()
        _, kwargs = mock_client.containers.run.call_args
        assert kwargs['image'] == 'simples-runner:latest'
        assert kwargs['remove'] is True
        assert kwargs['read_only'] is True
        assert kwargs['network_mode'] == 'none'

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_streams_stdout_to_ws(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        stdout_header = bytes([1, 0, 0, 0, 0, 0, 0, 6])
        stdout_payload = b'hello\n'
        mock_socket._sock.recv.side_effect = [
            stdout_header + stdout_payload,
            b'',
        ]
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'output', 'data': 'hello\n'}))

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_captures_exit_code(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket
        mock_socket._sock.recv.side_effect = [b'']
        mock_container.wait.return_value = {'StatusCode': 42}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'exit', 'code': 42}))

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_timeout_sends_timeout_message(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        recv_called = [False]

        def delayed_recv(_):
            if not recv_called[0]:
                recv_called[0] = True
                import gevent
                gevent.sleep(0.2)
                return b''
            return b''

        mock_socket._sock.recv.side_effect = delayed_recv
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.TIMEOUT_SECONDS = 0.05
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'timeout'}))

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_terminate_sends_sigterm_then_sigkill(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy.terminate(ws)

        kill_calls = [call[0][0] for call in mock_container.kill.call_args_list]
        assert 'SIGTERM' in kill_calls
        assert 'SIGKILL' in kill_calls

    def test_cleanup_removes_tmpdir(self):
        tmpdir = tempfile.mkdtemp()
        strategy = PtyExecutionStrategy()
        strategy.tmpdir = tmpdir

        assert os.path.exists(tmpdir)
        strategy.cleanup()
        assert not os.path.exists(tmpdir)

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_write_sends_input_to_container(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy.write('42\n')

        mock_container.attach_socket.assert_called_once()
        mock_socket._sock.send.assert_called_once_with(b'42\n')

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_stderr_streamed_as_error(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        stderr_header = bytes([2, 0, 0, 0, 0, 0, 0, 20])
        stderr_payload = b'segmentation fault\n'
        mock_socket._sock.recv.side_effect = [
            stderr_header + stderr_payload,
            b'',
        ]
        mock_container.wait.return_value = {'StatusCode': 139}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'error', 'data': 'segmentation fault\n'}))


class TestExecutionStrategyIntegration:
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_full_lifecycle(self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        stdout = bytes([1, 0, 0, 0, 0, 0, 0, 3]) + b'ok\n'
        mock_socket._sock.recv.side_effect = [stdout, b'']
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.spawn(ws, binary_session_key='test_key')

        sent_messages = [json.loads(call[0][0]) for call in ws.send.call_args_list]
        types = [m['type'] for m in sent_messages]
        assert 'output' in types
        assert 'exit' in types
```

- [ ] **Step 2: Run tests — verify 10 tests FAIL**

```bash
python3 -m pytest backend/tests/test_execution_strategy.py -v
```

Expected: 10 tests FAIL (module `app.strategies.execution` not found, `PtyExecutionStrategy` not defined).

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_execution_strategy.py
git commit -m "test(backend): add PtyExecutionStrategy tests (10 TDD, all fail)"
```

---

### Task 3: Implement PtyExecutionStrategy

**Files:**
- Create: `backend/app/strategies/__init__.py`
- Create: `backend/app/strategies/execution.py`

- [ ] **Step 1: Create the strategy package**

```python
# backend/app/strategies/__init__.py
```

(empty file)

- [ ] **Step 2: Implement PtyExecutionStrategy**

```python
import json
import os
import shutil
import tempfile

import docker
import gevent
import structlog

logger = structlog.get_logger()


class PtyExecutionStrategy:
    TIMEOUT_SECONDS = int(os.getenv('EXEC_TIMEOUT_S', '10'))
    RUNNER_IMAGE = os.getenv('RUNNER_IMAGE', 'simples-runner:latest')

    def __init__(self):
        self.container = None
        self.tmpdir = None

    def spawn(self, ws, binary_session_key):
        self.tmpdir = tempfile.mkdtemp()
        # binary_session_key maps to the compiler's tmpdir name (e.g. uuid hex)
        # The compiler stores the binary in its tmpdir; we copy it to our tmpdir
        # Compiler tmpdir pattern: /tmp/simples/<uuid>/programa (from docker-compose volume)
        binary_path = f'/tmp/simples/{binary_session_key}/programa'
        dest = os.path.join(self.tmpdir, 'prog')
        shutil.copy(binary_path, dest)
        os.chmod(dest, 0o755)

        client = docker.from_env()
        self.container = client.containers.run(
            image=self.RUNNER_IMAGE,
            command='./prog',
            volumes={self.tmpdir: {'bind': '/sandbox', 'mode': 'ro'}},
            working_dir='/sandbox',
            remove=True,
            read_only=True,
            network_mode='none',
            mem_limit='64m',
            nano_cpus=500_000_000,
            user='65534:65534',
            pids_limit=32,
            stop_timeout=2,
            detach=True,
            stdin_open=True,
            stdout=True,
            stderr=True,
        )

        socket = self.container.attach_socket(params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
        self._stream_output(ws, socket)

    def _stream_output(self, ws, socket):
        timeout_event = gevent.event.Event()
        timeout_greenlet = gevent.spawn_later(self.TIMEOUT_SECONDS, timeout_event.set)

        try:
            while not timeout_event.is_set():
                try:
                    header = socket._sock.recv(8)
                except Exception:
                    break
                if not header or len(header) < 8:
                    break
                stream_type = header[0]
                size = int.from_bytes(header[4:8], 'big')
                payload = b''
                while len(payload) < size:
                    chunk = socket._sock.recv(size - len(payload))
                    if not chunk:
                        break
                    payload += chunk
                if not payload:
                    break
                text = payload.decode('utf-8', errors='replace')
                if stream_type == 1:
                    ws.send(json.dumps({'type': 'output', 'data': text}))
                elif stream_type == 2:
                    ws.send(json.dumps({'type': 'error', 'data': text}))

            if timeout_event.is_set():
                ws.send(json.dumps({'type': 'timeout'}))
                self._force_kill()
            else:
                exit_code = self.container.wait()['StatusCode']
                ws.send(json.dumps({'type': 'exit', 'code': exit_code}))
        finally:
            timeout_greenlet.kill()
            self.cleanup()

    def write(self, data):
        if self.container is None:
            return
        socket = self.container.attach_socket(params={'stdin': 1, 'stream': 1})
        socket._sock.send(data.encode('utf-8'))

    def terminate(self, ws):
        if self.container is None:
            return
        self.container.kill(signal='SIGTERM')
        gevent.sleep(1)
        try:
            self.container.kill(signal='SIGKILL')
        except docker.errors.APIError:
            pass
        ws.send(json.dumps({'type': 'exit', 'code': -1}))
        self.cleanup()

    def _force_kill(self):
        if self.container is None:
            return
        try:
            self.container.kill(signal='SIGTERM')
        except Exception:
            pass
        gevent.sleep(1)
        try:
            self.container.kill(signal='SIGKILL')
        except Exception:
            pass

    def cleanup(self):
        if self.tmpdir and os.path.exists(self.tmpdir):
            shutil.rmtree(self.tmpdir, ignore_errors=True)
        self.tmpdir = None
        self.container = None
```

- [ ] **Step 3: Run tests — verify all 10 tests PASS**

```bash
python3 -m pytest backend/tests/test_execution_strategy.py -v
```

Expected: 10 passed.

- [ ] **Step 4: Commit**

```bash
git add backend/app/strategies/__init__.py backend/app/strategies/execution.py
git commit -m "feat(backend): implement PtyExecutionStrategy with 3-layer timeout"
```

---

### Task 4: Create WebSocket Route `/ws/run`

**Files:**
- Create: `backend/app/routes/execution.py`
- Modify: `backend/app/__init__.py:30-37`

- [ ] **Step 1: Create the WebSocket route handler**

```python
import json
from urllib.parse import parse_qs

import structlog

from app.middleware.auth import get_supabase
from app.strategies.execution import PtyExecutionStrategy

logger = structlog.get_logger()


def handle_execution_ws(ws):
    qs = parse_qs(ws.environ.get('QUERY_STRING', ''))
    token = qs.get('token', [None])[0]
    if not token:
        ws.close(4001, 'Missing token')
        return

    try:
        user_response = get_supabase().auth.get_user(token)
        user_id = user_response.user.id
    except Exception:
        ws.close(4001, 'Invalid token')
        return

    logger.info('execution_ws_connected', user_id=user_id)
    strategy = PtyExecutionStrategy()

    try:
        for msg in ws:
            try:
                data = json.loads(msg)
            except json.JSONDecodeError:
                continue
            msg_type = data.get('type', '')
            if msg_type == 'execute':
                binary_key = data.get('binary_key', '')
                if binary_key:
                    strategy.spawn(ws, binary_session_key=binary_key)
            elif msg_type == 'input':
                strategy.write(data.get('data', ''))
            elif msg_type == 'stop':
                strategy.terminate(ws)
                break
    except Exception:
        logger.exception('execution_ws_error', user_id=user_id)
    finally:
        strategy.cleanup()
        logger.info('execution_ws_disconnected', user_id=user_id)
```

- [ ] **Step 2: Register WebSocket route in app factory**

In `backend/app/__init__.py`, add after line 30 (`_sock = Sock(app)`):

```python
    # Inicializar flask-sock
    _sock = Sock(app)

    # Registrar rota WebSocket
    from app.routes.execution import handle_execution_ws

    _sock.route('/ws/run')(handle_execution_ws)
```

- [ ] **Step 3: Verify app loads without import errors**

```bash
cd backend && python3 -c "from app import create_app; create_app(); print('OK')"
```

Expected: `OK` (no ImportError or route registration errors).

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes/execution.py backend/app/__init__.py
git commit -m "feat(backend): add /ws/run WebSocket endpoint with JWT auth"
```

---

### Task 5: Create useExecution Hook

**Files:**
- Create: `frontend/src/hooks/useExecution.ts`

- [ ] **Step 1: Create the hook**

```ts
import { useReducer, useRef, useCallback } from 'react'
import { useAuth } from '../lib/auth'

type ExecutionState = 'idle' | 'connecting' | 'running' | 'stopping' | 'finished' | 'error' | 'timeout'

type ExecutionAction =
  | { type: 'CONNECT' }
  | { type: 'CONNECTED' }
  | { type: 'RUN' }
  | { type: 'STOP' }
  | { type: 'EXIT'; code: number }
  | { type: 'TIMEOUT' }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' }

interface ExecutionStateData {
  state: ExecutionState
  exitCode: number | null
  error: string | null
}

function executionReducer(s: ExecutionStateData, action: ExecutionAction): ExecutionStateData {
  switch (action.type) {
    case 'CONNECT':
      return { state: 'connecting', exitCode: null, error: null }
    case 'CONNECTED':
      return { state: 'running', exitCode: null, error: null }
    case 'RUN':
      return { state: 'running', exitCode: null, error: null }
    case 'STOP':
      return { state: 'stopping', exitCode: null, error: null }
    case 'EXIT':
      return { state: 'finished', exitCode: action.code, error: null }
    case 'TIMEOUT':
      return { state: 'timeout', exitCode: -1, error: 'Timeout (10s)' }
    case 'ERROR':
      return { state: 'error', exitCode: null, error: action.message }
    case 'RESET':
      return { state: 'idle', exitCode: null, error: null }
  }
}

interface ExecutionContext {
  state: ExecutionState
  exitCode: number | null
  error: string | null
  registerOutput: (cb: (data: string) => void) => void
  execute: (binaryKey: string) => void
  sendInput: (data: string) => void
  stop: () => void
}

export function useExecution(): ExecutionContext {
  const { session } = useAuth()
  const wsRef = useRef<WebSocket | null>(null)
  const outputCallbackRef = useRef<((data: string) => void) | null>(null)

  const [stateData, dispatch] = useReducer(executionReducer, {
    state: 'idle',
    exitCode: null,
    error: null,
  } as ExecutionStateData)

  const registerOutput = useCallback((cb: (data: string) => void) => {
    outputCallbackRef.current = cb
  }, [])

  const connect = useCallback(
    (binaryKey: string) => {
      if (!session) return
      dispatch({ type: 'CONNECT' })

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws/run?token=${session.access_token}`)
      wsRef.current = ws

      ws.onopen = () => {
        dispatch({ type: 'CONNECTED' })
        ws.send(JSON.stringify({ type: 'execute', binary_key: binaryKey }))
        dispatch({ type: 'RUN' })
      }

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data)
          switch (msg.type) {
            case 'output':
              outputCallbackRef.current?.(msg.data)
              break
            case 'error':
              outputCallbackRef.current?.(`\x1b[31m${msg.data}\x1b[0m`)
              break
            case 'exit':
              dispatch({ type: 'EXIT', code: msg.code })
              break
            case 'timeout':
              dispatch({ type: 'TIMEOUT' })
              break
          }
        } catch {
          // ignore malformed messages
        }
      }

      ws.onerror = () => dispatch({ type: 'ERROR', message: 'Connection error' })

      ws.onclose = (e) => {
        if (e.code === 4001) {
          dispatch({ type: 'ERROR', message: 'Authentication failed' })
        } else if (stateData.state !== 'finished' && stateData.state !== 'timeout' && stateData.state !== 'error') {
          dispatch({ type: 'EXIT', code: -1 })
        }
      }
    },
    [session]
  )

  const execute = useCallback(
    (binaryKey: string) => {
      connect(binaryKey)
    },
    [connect]
  )

  const sendInput = useCallback((data: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'input', data }))
  }, [])

  const stop = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: 'stop' }))
    dispatch({ type: 'STOP' })
  }, [])

  return {
    state: stateData.state,
    exitCode: stateData.exitCode,
    error: stateData.error,
    registerOutput,
    execute,
    sendInput,
    stop,
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build -C frontend 2>&1 | tail -5
```

Expected: Build succeeds (no TS errors for the new file).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useExecution.ts
git commit -m "feat(frontend): add useExecution hook with WebSocket state machine"
```

---

### Task 6: Create Terminal Component

**Files:**
- Create: `frontend/src/components/Terminal.tsx`

- [ ] **Step 1: Create Terminal component**

```tsx
import { useEffect, useRef } from 'react'
import { Terminal as XtermTerminal } from '@xterm/xterm'
import '@xterm/xterm/css/xterm.css'

interface TerminalProps {
  onInput: (data: string) => void
  onOutput: (cb: (data: string) => void) => void
}

export function Terminal({ onInput, onOutput }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XtermTerminal | null>(null)

  useEffect(() => {
    if (!terminalRef.current) return

    const term = new XtermTerminal({
      theme: { background: '#0a0a1a', foreground: '#e0e0e0', cursor: '#00bcd4' },
      fontSize: 13,
      fontFamily: "'Cascadia Code', 'Fira Code', 'JetBrains Mono', monospace",
      cursorBlink: true,
      cols: 80,
      rows: 12,
    })
    term.open(terminalRef.current)
    xtermRef.current = term

    onOutput((data: string) => {
      term.write(data)
    })

    return () => {
      term.dispose()
    }
  }, [])

  useEffect(() => {
    const term = xtermRef.current
    if (!term) return

    const disposable = term.onData((data) => {
      onInput(data)
    })

    return () => {
      disposable.dispose()
    }
  }, [onInput])

  return <div ref={terminalRef} className="h-full w-full" />
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build -C frontend 2>&1 | tail -5
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/Terminal.tsx
git commit -m "feat(frontend): add xterm.js Terminal component"
```

---

### Task 7: Integrate Terminal + Run/Stop Buttons in index.tsx

**Files:**
- Modify: `frontend/src/routes/index.tsx`

- [ ] **Step 1: Read the current index.tsx for reference patterns**

Key existing patterns to preserve:
- `createFileRoute('/')({ component: Index })` for route registration
- `useAuth()` for session access
- `react-resizable-panels` for panel layout
- `SimplesEditor` and `NasmPanel` components
- Tailwind CSS classes (`bg-[#16213e]`, `border-[#0f3460]`, etc.)

- [ ] **Step 2: Modify index.tsx**

Replace the current `Index` function with the updated version that includes Terminal + Run/Stop:

```tsx
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels'
import { SimplesEditor, type CompileMarker } from '../components/SimplesEditor'
import { NasmPanel } from '../components/NasmPanel'
import { Terminal } from '../components/Terminal'
import { useAuth } from '../lib/auth'
import { useExecution } from '../hooks/useExecution'

export const Route = createFileRoute('/')({ component: Index })

type NasmState = 'idle' | 'compiling' | 'success' | 'infra-error'

const SIMPLESC_PHASES = new Set(['lexer', 'parser', 'semantic'])

function Index() {
  const { session } = useAuth()
  const {
    state: execState,
    exitCode,
    error: execError,
    registerOutput,
    execute,
    sendInput,
    stop,
  } = useExecution()

  const [code, setCode] = useState('')
  const [isCompiling, setIsCompiling] = useState(false)
  const [nasmState, setNasmState] = useState<NasmState>('idle')
  const [nasmAsm, setNasmAsm] = useState('')
  const [nasmErrorLog, setNasmErrorLog] = useState('')
  const [markers, setMarkers] = useState<CompileMarker[]>([])
  const [infraError, setInfraError] = useState<string | null>(null)
  const [binaryKey, setBinaryKey] = useState<string | null>(null)

  async function handleCompileAndRun() {
    if (!session || isCompiling) return
    setIsCompiling(true)
    setNasmState('compiling')
    setMarkers([])
    setInfraError(null)
    setNasmAsm('')
    setNasmErrorLog('')
    setBinaryKey(null)
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
        binary_key?: string
        error?: string
        phase?: string
        line?: number
        column?: number
      } = await resp.json()
      if (resp.ok && data.asm) {
        setNasmAsm(data.asm)
        setNasmState('success')
        if (data.binary_key) {
          setBinaryKey(data.binary_key)
          execute(data.binary_key)
        }
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
      <div className="flex items-center gap-3 px-4 py-2 bg-[#16213e] border-b border-[#0f3460]">
        <button
          onClick={handleCompileAndRun}
          disabled={
            isCompiling || !session || execState === 'running' || execState === 'connecting' || execState === 'stopping'
          }
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
        >
          {isCompiling
            ? 'Compilando...'
            : execState === 'running'
              ? '▶ Executando...'
              : execState === 'connecting'
                ? 'Conectando...'
                : execState === 'stopping'
                  ? 'Parando...'
                  : '▶ Run'}
        </button>
        {execState === 'running' && (
          <button
            onClick={stop}
            className="px-4 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
          >
            ■ Stop
          </button>
        )}
        {execState === 'finished' && exitCode !== null && (
          <span className={`text-sm ${exitCode === 0 ? 'text-green-400' : 'text-red-400'}`}>
            Exit code: {exitCode}
          </span>
        )}
        {execState === 'timeout' && <span className="text-sm text-yellow-400">Timeout (10s)</span>}
        {execState === 'error' && execError && (
          <span className="text-sm text-red-400">{execError}</span>
        )}
      </div>
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
      <PanelGroup orientation="horizontal" className="flex-1 min-h-0">
        <Panel defaultSize={55} minSize={25}>
          <SimplesEditor value={code} onChange={setCode} readOnly={isCompiling || execState === 'running'} markers={markers} />
        </Panel>
        <PanelResizeHandle className="w-1 bg-[#0f3460] hover:bg-cyan-700 transition-colors cursor-col-resize" />
        <Panel defaultSize={45} minSize={20}>
          <NasmPanel state={nasmState} asm={nasmAsm} errorLog={nasmErrorLog} />
        </Panel>
      </PanelGroup>
      <div className="h-48 border-t border-[#0f3460]">
        <Terminal onInput={sendInput} onOutput={registerOutput} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Run lint + build**

```bash
make lint-frontend && npm run build -C frontend
```

Expected: Lint passes (0 warnings), build succeeds.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/routes/index.tsx
git commit -m "feat(frontend): integrate Terminal + Run/Stop buttons in 3-panel layout"
```

---

### Task 8: Backend — Return binary_key from /api/compile

**Files:**
- Modify: `backend/app/routes/compile.py:32-42`
- Modify: `backend/app/services/compiler.py:compile_full signature`

- [ ] **Step 1: Modify CompilerService.compile_full to return binary_key**

In `backend/app/services/compiler.py`, update `compile_full()` to also store and return the binary key. The binary is already compiled and saved to a path. Add a `binary_key` field to `CompileResult`:

```python
@dataclass
class CompileResult:
    success: bool
    asm: str | None = None
    binary_key: str | None = None
    error: str | None = None
    line: int | None = None
    column: int | None = None
    phase: str | None = None
```

In `compile_full()`, set `binary_key` to a unique key (same as the tmpdir name) when compilation succeeds:

```python
def compile_full(self, code: str) -> CompileResult:
    # ... existing validation ...
    # After successful nasm + ld:
    result.binary_key = os.path.basename(self._tmpdir)  # or similar unique key
    return result
```

- [ ] **Step 2: Modify compile route to return binary_key**

In `backend/app/routes/compile.py`, update the success response:

```python
if result.success:
    logger.info('compile_success', code_size=len(code))
    response = {'asm': result.asm}
    if result.binary_key:
        response['binary_key'] = result.binary_key
    return jsonify(response), 200
```

- [ ] **Step 3: Verify existing tests still pass**

```bash
cd backend && python3 -m pytest tests/test_compiler_service.py -v
```

Expected: All existing tests pass (they create their own result objects without `binary_key`).

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/compiler.py backend/app/routes/compile.py
git commit -m "feat(backend): return binary_key from /api/compile for execution"
```

---

### Task 9: Verification — Lint, Tests, Build

- [ ] **Step 1: Run backend lint**

```bash
make lint-backend
```

Expected: `ruff check .` passes without errors.

- [ ] **Step 2: Run all backend tests**

```bash
cd backend && python3 -m pytest -v
```

Expected: All 23 (Sprint 2) + 10 (Sprint 3) = 33 tests PASSED.

- [ ] **Step 3: Run frontend lint + build**

```bash
make lint-frontend && npm run build -C frontend
```

Expected: ESLint passes (0 warnings), TypeScript build succeeds.

- [ ] **Step 4: Verify nginx /ws/ proxy is correctly configured**

```bash
grep -A 8 'location /ws/' nginx/nginx.dev.conf
```

Expected: Shows WebSocket proxy block with `proxy_http_version 1.1`, `Upgrade`, `Connection` headers, and `proxy_pass http://backend_upstream`. (Already confirmed in Sprint 2.)

- [ ] **Step 5: Verify runner Docker image exists**

```bash
docker compose build runner_image_build
```

Expected: `simples-runner:latest` image built successfully.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: final verification — lint, tests, build all pass"
```

---

## Summary

| # | Task | Files | Tests |
|---|------|-------|-------|
| 1 | Install xterm.js | `package.json` | Build check |
| 2 | Write execution tests (TDD) | `test_execution_strategy.py` | 10 new (fail) |
| 3 | Implement PtyExecutionStrategy | `strategies/execution.py` | 10 pass |
| 4 | WebSocket route /ws/run | `routes/execution.py`, `__init__.py` | Import check |
| 5 | useExecution hook | `useExecution.ts` | TS compile |
| 6 | Terminal component | `Terminal.tsx` | TS compile |
| 7 | Integrate in index.tsx | `routes/index.tsx` | Lint + build |
| 8 | Return binary_key from compile | `compiler.py`, `compile.py` | Existing tests |
| 9 | Final verification | All | 33 backend tests + lint + build |

**Total:** 33 backend tests (23 existing + 10 new), TypeScript build clean, lint clean.
