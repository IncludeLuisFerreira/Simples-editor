import io
import json
import os
import shutil
import tarfile
from uuid import uuid4

import docker
import gevent
import gevent.event
import structlog

logger = structlog.get_logger()


class PtyExecutionStrategy:
    TIMEOUT_SECONDS = int(os.getenv('EXEC_TIMEOUT_S', '10'))
    RUNNER_IMAGE = os.getenv('RUNNER_IMAGE', 'simples-runner:latest')

    def __init__(self):
        self.container = None
        self.tmpdir = None
        self._stdin_socket = None

    def spawn(self, ws, binary_session_key):
        try:
            self.tmpdir = os.path.join('/tmp/simples', f'exec-{uuid4().hex}')
            os.makedirs(self.tmpdir, exist_ok=True)
            binary_path = f'/tmp/simples/{binary_session_key}/programa'
            dest = os.path.join(self.tmpdir, 'prog')
            shutil.copy(binary_path, dest)
            os.chmod(dest, 0o755)

            client = docker.from_env()
            self.container = client.containers.create(
                image=self.RUNNER_IMAGE,
                command='./prog',
                working_dir='/sandbox',
                read_only=True,
                network_mode='none',
                mem_limit='64m',
                nano_cpus=500_000_000,
                user='65534:65534',
                pids_limit=32,
                stdin_open=True,
            )

            archive_data = io.BytesIO()
            with tarfile.open(fileobj=archive_data, mode='w') as tar:
                tar.add(dest, arcname='prog')
            archive_data.seek(0)
            self.container.put_archive('/sandbox', archive_data.read())

            self.container.start()

            self._stdin_socket = self.container.attach_socket(
                params={'stdin': 1, 'stream': 1})
            socket = self.container.attach_socket(
                params={'stdin': 1, 'stdout': 1, 'stderr': 1, 'stream': 1})
            logger.info(
                'execution_container_started',
                image=self.RUNNER_IMAGE,
                key=binary_session_key,
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
                ws.send(json.dumps({'type': 'timeout'}))
                self._force_kill()
            elif self.container is not None:
                exit_code = self.container.wait()['StatusCode']
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
