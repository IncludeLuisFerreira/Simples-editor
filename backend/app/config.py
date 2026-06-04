import os

class Config:
    """Configuração base da aplicação"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    FLASK_ENV = os.getenv('FLASK_ENV', 'production')
    
    # Supabase
    SUPABASE_URL = os.getenv('SUPABASE_URL', '')
    SUPABASE_ANON_KEY = os.getenv('SUPABASE_ANON_KEY', '')
    JWT_SECRET = os.getenv('JWT_SECRET', '')
    
    # Timeouts
    EXEC_TIMEOUT_S = int(os.getenv('EXEC_TIMEOUT_S', '10'))
    COMPILE_TIMEOUT_S = int(os.getenv('COMPILE_TIMEOUT_S', '15'))
    
    # Limits
    MAX_CODE_KB = int(os.getenv('MAX_CODE_KB', '64'))
    RUNS_PER_MINUTE = int(os.getenv('RUNS_PER_MINUTE', '30'))
    
    # Runner
    RUNNER_IMAGE = os.getenv('RUNNER_IMAGE', 'simples-runner:latest')
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
