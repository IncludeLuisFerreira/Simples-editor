import structlog
from flask import Flask, jsonify, request
from flask_limiter.errors import RateLimitExceeded
from flask_sock import Sock

logger = structlog.get_logger()


def create_app():
    """Application factory"""
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    # Configurar structlog
    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.stdlib.filter_by_level,
            structlog.stdlib.add_logger_name,
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt='iso'),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.stdlib.BoundLogger,
        logger_factory=structlog.stdlib.LoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Inicializar request logging
    from app.middleware.logging import register_request_logging

    register_request_logging(app)

    # Inicializar rate limiter
    from app.middleware.ratelimit import limiter

    limiter.init_app(app)

    @app.errorhandler(RateLimitExceeded)
    def handle_rate_limit(exc):
        logger.warning('rate_limit_exceeded', path=request.path)
        return jsonify(
            {
                'error': 'Rate limit exceeded. Please wait before making more requests.',
            }
        ), 429

    # Inicializar flask-sock
    _sock = Sock(app)

    # Registrar rota WebSocket
    from app.routes.execution import handle_execution_ws

    _sock.route('/ws/run')(handle_execution_ws)

    # Registrar blueprints
    from app.routes import auth, compile, health

    app.register_blueprint(health.bp)
    app.register_blueprint(auth.bp)
    app.register_blueprint(compile.bp)

    return app
