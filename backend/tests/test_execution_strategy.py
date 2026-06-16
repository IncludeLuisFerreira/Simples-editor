import json
import os
import tempfile
from unittest.mock import MagicMock, patch

from app.strategies.execution import PtyExecutionStrategy


class TestPtyExecutionStrategy:
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_creates_tmpdir_and_container(
        self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree,
    ):
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        with patch('app.strategies.execution.gevent.spawn') as mock_spawn:
            strategy.spawn(ws, binary_session_key='test_key')

        mock_mkdtemp.assert_called_once()
        mock_client.containers.run.assert_called_once()
        _, kwargs = mock_client.containers.run.call_args
        assert kwargs['image'] == 'simples-runner:latest'
        assert kwargs['remove'] is True
        assert kwargs['read_only'] is True
        assert kwargs['network_mode'] == 'none'
        mock_spawn.assert_called_once()

    @patch('app.strategies.execution.gevent.spawn_later')
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_streams_stdout_to_ws(
        self,
        mock_docker,
        mock_mkdtemp,
        mock_chmod,
        mock_copy,
        mock_rmtree,
        mock_spawn_later,
    ):
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
            stdout_header,
            stdout_payload,
            b'',
        ]
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'output', 'data': 'hello\n'}))

    @patch('app.strategies.execution.gevent.spawn_later')
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_captures_exit_code(
        self,
        mock_docker,
        mock_mkdtemp,
        mock_chmod,
        mock_copy,
        mock_rmtree,
        mock_spawn_later,
    ):
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
        strategy.container = mock_container
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'exit', 'code': 42}))

    @patch('app.strategies.execution.gevent.event.Event')
    @patch('app.strategies.execution.gevent.spawn_later')
    @patch('app.strategies.execution.shutil.rmtree')
    def test_timeout_sends_timeout_message(self, mock_rmtree, mock_spawn_later, mock_event):
        mock_event_instance = MagicMock()
        is_set_vals = [False, True]
        mock_event_instance.is_set.side_effect = lambda: is_set_vals.pop(0)
        mock_event.return_value = mock_event_instance

        mock_container = MagicMock()
        mock_socket = MagicMock()

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({'type': 'timeout'}))

    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_terminate_sends_sigterm_then_sigkill(
        self, mock_docker, mock_mkdtemp, mock_chmod, mock_copy, mock_rmtree,
    ):
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

    def test_write_sends_input_to_container(self):
        mock_socket = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy._stdin_socket = mock_socket
        strategy.write('42\n')

        mock_socket._sock.send.assert_called_once_with(b'42\n')

    # stderr streaming verified by stdout test above (same multiplex parser, different stream type)


class TestExecutionStrategyIntegration:
    @patch('app.strategies.execution.gevent.spawn')
    @patch('app.strategies.execution.shutil.rmtree')
    @patch('app.strategies.execution.shutil.copy')
    @patch('app.strategies.execution.os.chmod')
    @patch('app.strategies.execution.tempfile.mkdtemp')
    @patch('app.strategies.execution.docker.from_env')
    def test_spawn_full_lifecycle(
        self,
        mock_docker,
        mock_mkdtemp,
        mock_chmod,
        mock_copy,
        mock_rmtree,
        mock_spawn,
    ):
        mock_spawn.side_effect = lambda fn, ws, socket: fn(ws, socket)
        mock_mkdtemp.return_value = '/tmp/test-abc'
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.run.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        stdout_header = bytes([1, 0, 0, 0, 0, 0, 0, 3])
        stdout_payload = b'ok\n'
        mock_socket._sock.recv.side_effect = [stdout_header, stdout_payload, b'']
        mock_container.wait.return_value = {'StatusCode': 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.spawn(ws, binary_session_key='test_key')

        sent_messages = [json.loads(call[0][0]) for call in ws.send.call_args_list]
        types = [m['type'] for m in sent_messages]
        assert 'output' in types
        assert 'exit' in types
