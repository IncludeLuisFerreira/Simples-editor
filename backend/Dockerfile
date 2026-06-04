FROM python:3.11-slim AS builder

# Instalar dependências de compilação
RUN apt-get update && apt-get install -y \
    gcc \
    make \
    git \
    && rm -rf /var/lib/apt/lists/*

# Compilar simplesc
RUN git clone https://github.com/includeluisferreira/simples-compiler.git /tmp/simplesc && \
    cd /tmp/simplesc && \
    make && \
    cp simplesc /usr/local/bin/ && \
    rm -rf /tmp/simplesc

FROM python:3.11-slim

# Instalar runtime dependencies
RUN apt-get update && apt-get install -y \
    nasm \
    binutils-i686-linux-gnu \
    && rm -rf /var/lib/apt/lists/*

# Copiar simplesc do builder
COPY --from=builder /usr/local/bin/simplesc /usr/local/bin/

WORKDIR /app

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["gunicorn", "--worker-class", "gevent", "--workers", "4", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "--error-logfile", "-", "app.main:app"]

