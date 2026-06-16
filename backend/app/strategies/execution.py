import json
import os
import shutil
import time
from uuid import uuid4

import docker
import gevent
import gevent.event
import structlog

logger = structlog.get_logger()


class PtyExecutionStrategy:
    TIMEOUT_SECONDS = int(os.getenv('EXEC_TIMEOUT_S', '10'))
    RUNNER_IMAGE = os.getenv('RUNNER_IMAGE', 'simples-runner:latest')
    MEM_LIMIT_MB = int(os.getenv('MEM_SANDBOX_LIMIT_MB', '128'))
    PIDS_LIMIT = int(os.getenv('PIDS_SANDBOX_LIMIT', '64'))
    DOCKER_STOP_TIMEOUT_S = int(os.getenv('DOCKER_STOP_TIMEOUT_S', '12'))

    def __init__(self):
        self.container = None
        self.tmpdir = None
        self._stdin_socket = None
        self._start_time: float | None = None

    def spawn(self, ws, binary_session_key):
        try:
            self._start_time = time.time()
            self.tmpdir = os.path.join('/tmp/simples', f'exec-{uuid4().hex}')
            os.makedirs(self.tmpdir, exist_ok=True)
            binary_path = f'/tmp/simples/{binary_session_key}/programa'
            dest = os.path.join(self.tmpdir, 'prog')
            shutil.copy(binary_path, dest)
            os.chmod(dest, 0o755)

            binary_size = os.path.getsize(dest)
            command = (
                f'sh -c "head -c {binary_size} > /tmp/prog && chmod +x /tmp/prog && /tmp/prog"'
            )

            client = docker.from_env()
            self.container = client.containers.create(
                image=self.RUNNER_IMAGE,
                command=command,
                working_dir='/sandbox',
                read_only=True,
                network_mode='none',
                mem_limit=f'{self.MEM_LIMIT_MB}m',
                memswap_limit=f'{self.MEM_LIMIT_MB}m',
                nano_cpus=500_000_000,
                user='65534:65534',
                pids_limit=self.PIDS_LIMIT,
                stdin_open=True,
                cap_drop=['ALL'],
                security_opt=['no-new-privileges:true'],
                tmpfs={'/tmp': 'size=8m,exec,nosuid,nodev,mode=1777'},
                privileged=False,
                stop_timeout=self.DOCKER_STOP_TIMEOUT_S,
            )

            self.container.start()

            self._stdin_socket = self.container.attach_socket(params={'stdin': 1, 'stream': 1})
            socket = self.container.attach_socket(
                params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1}
            )

            with open(dest, 'rb') as f:
                binary_data = f.read()
            socket._sock.send(binary_data)

            logger.info(
                'execution_container_started',
                image=self.RUNNER_IMAGE,
                key=binary_session_key,
                size=binary_size,
            )
            gevent.spawn(self._stream_output, ws, socket)
        except Exception:
            self.cleanup()
            raise

    def _stream_output(self, ws, socket):
        timeout_event = gevent.event.Event()
        timeout_greenlet = gevent.spawn_later(self.TIMEOUT_SECONDS, timeout_event.set)

        try:
            while not timeout_event.is_set():
                try:
                    header = socket._sock.recv(8)
                except (OSError, ConnectionError):
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
                duration_ms = round((time.time() - (self._start_time or 0)) * 1000)
                logger.warning(
                    'execution_outcome',
                    outcome='timeout',
                    timeout_s=self.TIMEOUT_SECONDS,
                    duration_ms=duration_ms,
                )
                ws.send(
                    json.dumps(
                        {
                            'type': 'timeout',
                            'limit_s': self.TIMEOUT_SECONDS,
                        }
                    )
                )
                self._force_kill()
            elif self.container is not None:
                exit_code = self.container.wait()['StatusCode']
                duration_ms = round((time.time() - (self._start_time or 0)) * 1000)
                logger.info(
                    'execution_outcome',
                    outcome='success',
                    exit_code=exit_code,
                    duration_ms=duration_ms,
                )
                ws.send(json.dumps({'type': 'exit', 'code': exit_code}))
        finally:
            timeout_greenlet.kill()
            self.cleanup()

    def write(self, data):
        if self._stdin_socket is None:
            return
        self._stdin_socket._sock.send(data.encode('utf-8'))

    def terminate(self, ws):
        if self.container is None:
            return
        self.container.kill('SIGTERM')
        gevent.sleep(1)
        try:
            self.container.kill('SIGKILL')
        except docker.errors.APIError:
            pass
        ws.send(json.dumps({'type': 'exit', 'code': -1}))
        self.cleanup()

    def _force_kill(self):
        if self.container is None:
            return
        try:
            self.container.kill('SIGTERM')
        except Exception:
            pass
        gevent.sleep(1)
        try:
            self.container.kill('SIGKILL')
        except Exception:
            pass

    def cleanup(self):
        if self.tmpdir and os.path.exists(self.tmpdir):
            shutil.rmtree(self.tmpdir, ignore_errors=True)
        self.tmpdir = None
        self.container = None
        self._stdin_socket = None
