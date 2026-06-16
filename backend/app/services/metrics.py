from prometheus_client import Counter, Gauge, Histogram

compile_duration = Histogram(
    'simples_compile_duration_seconds',
    'Compilation duration per phase',
    ['phase'],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 15.0],
)

execution_duration = Histogram(
    'simples_execution_duration_seconds',
    'Execution duration per outcome',
    ['outcome'],
    buckets=[0.5, 1.0, 2.5, 5.0, 10.0],
)

executions_total = Counter(
    'simples_executions_total',
    'Total executions by outcome',
    ['outcome'],
)

active_sandboxes = Gauge(
    'simples_active_sandboxes',
    'Number of currently active sandbox containers',
)

compile_errors_total = Counter(
    'simples_compile_errors_total',
    'Total compile errors by phase',
    ['phase'],
)

websocket_connections = Gauge(
    'simples_websocket_connections',
    'Number of active WebSocket connections',
)
