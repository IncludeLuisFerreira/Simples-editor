FROM debian:12-slim

RUN apt-get update && apt-get install -y \
    qemu-user-static \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /sandbox && chmod 755 /sandbox

USER 65534:65534

WORKDIR /sandbox
