import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from app.strategies.execution import PtyExecutionStrategy


def _docker_available():
    try:
        import docker

        docker.from_env().ping()
        return True
    except Exception:
        return False


@pytest.mark.skipif(not _docker_available(), reason="Docker not available")
class TestSandboxEscapeIntegration:
    RUNNER_IMAGE = os.getenv("RUNNER_IMAGE", "simples-runner:latest")

    @staticmethod
    def _run_in_sandbox(script: str, timeout: int = 15) -> tuple[int, str]:
        import docker as docker_mod

        client = docker_mod.from_env()
        container = client.containers.create(
            image=TestSandboxEscapeIntegration.RUNNER_IMAGE,
            command=f'sh -c "{script}"',
            working_dir="/sandbox",
            read_only=True,
            network_mode="none",
            mem_limit="128m",
            memswap_limit="128m",
            nano_cpus=500_000_000,
            user="65534:65534",
            pids_limit=64,
            cap_drop=["ALL"],
            security_opt=["no-new-privileges:true"],
            tmpfs={"/tmp": "size=8m,exec,nosuid,nodev,mode=1777"},
            privileged=False,
        )
        try:
            container.start()
            result = container.wait(timeout=timeout)
            logs = container.logs(stdout=True, stderr=True).decode(
                "utf-8", errors="replace"
            )
            return result["StatusCode"], logs
        except Exception:
            try:
                container.kill()
            except Exception:
                pass
            return -1, ""
        finally:
            try:
                container.remove(force=True)
            except Exception:
                pass

    def test_fork_bomb_is_contained_by_pid_limit(self):
        exit_code, logs = self._run_in_sandbox(
            ":(){ :|:& };:",
            timeout=10,
        )
        assert exit_code != 0, (
            f"Fork bomb escaped sandbox (exit 0). "
            f"The container should have been killed by PID limit or timeout.\nLogs: {logs}"
        )

    def test_network_is_blocked_by_network_mode_none(self):
        exit_code, logs = self._run_in_sandbox(
            "ls /sys/class/net/ 2>&1",
            timeout=10,
        )
        interfaces = logs.strip().split()
        non_loopback = [i for i in interfaces if i != "lo"]
        assert len(non_loopback) == 0, (
            f"Container has network interfaces besides loopback: {non_loopback}. "
            f"network_mode=none should isolate all networking.\nLogs: {logs}"
        )

    def test_filesystem_write_outside_tmpfs_is_blocked(self):
        exit_code, logs = self._run_in_sandbox(
            "touch /etc/test_sandbox_write 2>&1 && echo WRITE_OK || echo WRITE_BLOCKED",
            timeout=10,
        )
        assert "WRITE_BLOCKED" in logs, (
            f"Write to /etc outside tmpfs succeeded. "
            f"read_only rootfs + nobody user should block writes.\nExit: {exit_code}\nLogs: {logs}"
        )


class TestPtyExecutionStrategy:
    @patch("app.strategies.execution.shutil.rmtree")
    @patch("app.strategies.execution.shutil.copy")
    @patch("app.strategies.execution.os.chmod")
    @patch("app.strategies.execution.os.path.getsize")
    @patch("app.strategies.execution.os.makedirs")
    @patch("app.strategies.execution.uuid4")
    @patch("app.strategies.execution.docker.from_env")
    def test_spawn_creates_tmpdir_and_container(
        self,
        mock_docker,
        mock_uuid4,
        mock_makedirs,
        mock_getsize,
        mock_chmod,
        mock_copy,
        mock_rmtree,
    ):
        mock_uuid4.return_value.hex = "testabc123"
        mock_getsize.return_value = 128
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.create.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        with (
            patch("app.strategies.execution.gevent.spawn"),
            patch("builtins.open", create=True),
        ):
            strategy.spawn(ws, binary_session_key="test_key")

        mock_makedirs.assert_called_once()
        mock_client.containers.create.assert_called_once()
        mock_container.start.assert_called_once()
        _, kwargs = mock_client.containers.create.call_args
        assert kwargs["image"] == "simples-runner:latest"
        assert kwargs["read_only"] is True
        assert kwargs["network_mode"] == "none"
        assert "tmpfs" in kwargs

    @patch("app.strategies.execution.gevent.spawn_later")
    @patch("app.strategies.execution.gevent.event.Event")
    @patch("app.strategies.execution.shutil.rmtree")
    def test_spawn_streams_stdout_to_ws(
        self,
        mock_rmtree,
        mock_event,
        mock_spawn_later,
    ):
        mock_event_instance = MagicMock()
        mock_event_instance.is_set.return_value = False
        mock_event.return_value = mock_event_instance

        mock_container = MagicMock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_socket = MagicMock()
        stdout_header = bytes([1, 0, 0, 0, 0, 0, 0, 6])
        stdout_payload = b"hello\n"
        mock_socket._sock.recv.side_effect = [
            stdout_header,
            stdout_payload,
            b"",
        ]

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({"type": "output", "data": "hello\n"}))

    @patch("app.strategies.execution.gevent.spawn_later")
    @patch("app.strategies.execution.gevent.event.Event")
    @patch("app.strategies.execution.shutil.rmtree")
    def test_spawn_captures_exit_code(
        self,
        mock_rmtree,
        mock_event,
        mock_spawn_later,
    ):
        mock_event_instance = MagicMock()
        mock_event_instance.is_set.return_value = False
        mock_event.return_value = mock_event_instance

        mock_container = MagicMock()
        mock_container.wait.return_value = {"StatusCode": 42}
        mock_socket = MagicMock()
        mock_socket._sock.recv.side_effect = [b""]

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({"type": "exit", "code": 42}))

    @patch("app.strategies.execution.gevent.event.Event")
    @patch("app.strategies.execution.gevent.spawn_later")
    @patch("app.strategies.execution.shutil.rmtree")
    def test_timeout_sends_timeout_message(
        self, mock_rmtree, mock_spawn_later, mock_event
    ):
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

        ws.send.assert_any_call(json.dumps({"type": "timeout", "limit_s": 10}))

    @patch("app.strategies.execution.shutil.rmtree")
    def test_terminate_sends_sigterm_then_sigkill(self, mock_rmtree):
        mock_container = MagicMock()

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy.terminate(ws)

        kill_calls = [call[0][0] for call in mock_container.kill.call_args_list]
        assert "SIGTERM" in kill_calls
        assert "SIGKILL" in kill_calls

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
        strategy.write("42\n")

        mock_socket._sock.send.assert_called_once_with(b"42\n")

    def test_streams_stderr_to_ws(self):
        mock_container = MagicMock()
        mock_container.wait.return_value = {"StatusCode": 1}
        mock_socket = MagicMock()
        stderr_header = bytes([2, 0, 0, 0, 0, 0, 0, 6])
        stderr_payload = b"error\n"
        mock_socket._sock.recv.side_effect = [stderr_header, stderr_payload, b""]

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        with (
            patch("app.strategies.execution.gevent.spawn_later"),
            patch("app.strategies.execution.gevent.event.Event") as mock_event,
        ):
            mock_event.return_value.is_set.return_value = False
            strategy._stream_output(ws, mock_socket)

        ws.send.assert_any_call(json.dumps({"type": "error", "data": "error\n"}))

    def test_force_kill_sends_sigterm_then_sigkill(self):
        mock_container = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._force_kill()

        kill_calls = [call[0][0] for call in mock_container.kill.call_args_list]
        assert "SIGTERM" in kill_calls
        assert "SIGKILL" in kill_calls

    def test_force_kill_swallows_exceptions(self):
        mock_container = MagicMock()
        mock_container.kill.side_effect = Exception("kill failed")
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        strategy._force_kill()

    def test_terminate_without_container_does_nothing(self):
        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = None
        strategy.terminate(ws)
        ws.send.assert_not_called()

    def test_write_without_stdin_socket_does_nothing(self):
        strategy = PtyExecutionStrategy()
        strategy._stdin_socket = None
        strategy.write("test")  # should not raise

    def test_spawn_exception_calls_cleanup(self):
        with (
            patch("app.strategies.execution.docker.from_env") as mock_docker,
            patch("app.strategies.execution.os.makedirs"),
            patch("app.strategies.execution.shutil.copy"),
            patch("app.strategies.execution.os.chmod"),
            patch("app.strategies.execution.os.path.getsize"),
            patch("app.strategies.execution.os.path.exists", return_value=True),
            patch("app.strategies.execution.uuid4") as mock_uuid4,
            patch("app.strategies.execution.shutil.rmtree") as mock_rmtree,
        ):
            mock_uuid4.return_value.hex = "testabc123"
            mock_docker.return_value.containers.create.side_effect = Exception(
                "docker error"
            )

            ws = MagicMock()
            strategy = PtyExecutionStrategy()
            with pytest.raises(Exception):
                strategy.spawn(ws, binary_session_key="test_key")

            mock_rmtree.assert_called_once()

    def test_stream_output_oserror_breaks_loop(self):
        mock_container = MagicMock()
        mock_container.wait.return_value = {"StatusCode": 0}
        mock_socket = MagicMock()
        mock_socket._sock.recv.side_effect = OSError("connection reset")

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        strategy.container = mock_container
        with patch("app.strategies.execution.gevent.spawn_later"):
            strategy._stream_output(ws, mock_socket)


class TestExecutionStrategyIntegration:
    @patch("app.strategies.execution.gevent.spawn")
    @patch("app.strategies.execution.shutil.rmtree")
    @patch("app.strategies.execution.shutil.copy")
    @patch("app.strategies.execution.os.chmod")
    @patch("app.strategies.execution.os.path.getsize")
    @patch("app.strategies.execution.os.makedirs")
    @patch("app.strategies.execution.uuid4")
    @patch("app.strategies.execution.docker.from_env")
    def test_spawn_full_lifecycle(
        self,
        mock_docker,
        mock_uuid4,
        mock_makedirs,
        mock_getsize,
        mock_chmod,
        mock_copy,
        mock_rmtree,
        mock_spawn,
    ):
        mock_uuid4.return_value.hex = "testabc123"
        mock_getsize.return_value = 128
        mock_spawn.side_effect = lambda fn, ws, socket: fn(ws, socket)
        mock_client = MagicMock()
        mock_docker.return_value = mock_client
        mock_container = MagicMock()
        mock_client.containers.create.return_value = mock_container
        mock_socket = MagicMock()
        mock_container.attach_socket.return_value = mock_socket

        stdout_header = bytes([1, 0, 0, 0, 0, 0, 0, 3])
        stdout_payload = b"ok\n"
        mock_socket._sock.recv.side_effect = [stdout_header, stdout_payload, b""]
        mock_container.wait.return_value = {"StatusCode": 0}

        ws = MagicMock()
        strategy = PtyExecutionStrategy()
        with patch("builtins.open", create=True):
            strategy.spawn(ws, binary_session_key="test_key")

        sent_messages = [json.loads(call[0][0]) for call in ws.send.call_args_list]
        types = [m["type"] for m in sent_messages]
        assert "output" in types
        assert "exit" in types
