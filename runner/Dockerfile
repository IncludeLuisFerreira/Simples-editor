FROM debian:12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    qemu-user-static \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/share/doc /usr/share/man /usr/share/info /usr/share/locale

RUN mkdir -p /sandbox && chmod 755 /sandbox && chown 65534:65534 /sandbox

USER 65534:65534
WORKDIR /sandbox
