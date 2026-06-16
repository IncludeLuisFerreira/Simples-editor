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
