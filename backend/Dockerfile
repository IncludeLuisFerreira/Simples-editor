FROM ubuntu:24.04

RUN apt-get update && apt-get install -y \
    gcc \
    make \
    nasm \
    binutils-i686-linux-gnu \
    python3 \
    python3-pip \
    python3-venv \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN git clone https://github.com/includeluisferreira/simples-compiler.git /tmp/simplesc && \
    cd /tmp/simplesc && \
    make && \
    cp simplesc /usr/local/bin/ && \
    rm -rf /tmp/simplesc

COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1

EXPOSE 5000

CMD ["python3", "-m", "flask", "--app", "app.main", "run", "--host=0.0.0.0"]
