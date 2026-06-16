#!/usr/bin/env bash
set -euo pipefail

RUNNER_IMAGE="${RUNNER_IMAGE:-simples-runner:latest}"
HELLO_BIN="${HELLO_BIN:-/tmp/simples-hello}"

PASS=0
FAIL=0

pass() { PASS=$((PASS + 1)); echo "  PASS: $1"; }
fail() { FAIL=$((FAIL + 1)); echo "  FAIL: $1"; }

echo "=== Validando Runner Image ==="
echo "Arquitetura host: $(uname -m)"
echo "Runner image: $RUNNER_IMAGE"
echo ""

echo "--- 1. Image existe ---"
if docker image inspect "$RUNNER_IMAGE" > /dev/null 2>&1; then
    pass "Image $RUNNER_IMAGE encontrada"
else
    fail "Image $RUNNER_IMAGE nao encontrada (rode: docker compose build runner_image_build)"
fi

echo ""
echo "--- 2. qemu-user-static instalado ---"
QEMU_CHECK=$(docker run --rm "$RUNNER_IMAGE" sh -c "which qemu-i386-static 2>/dev/null || echo 'not_found'")
if [ "$QEMU_CHECK" = "not_found" ]; then
    fail "qemu-i386-static nao encontrado no PATH"
else
    pass "qemu-i386-static disponivel em: $QEMU_CHECK"
fi

echo ""
echo "--- 3. Execucao de binario x86 (hello world) ---"
cat > /tmp/simples-test-hello.s << 'EOF'
.section .text
.global _start
_start:
    movl $4, %eax
    movl $1, %ebx
    leal msg, %ecx
    movl $13, %edx
    int $0x80
    movl $1, %eax
    xorl %ebx, %ebx
    int $0x80
msg: .ascii "Hello, World!\n"
EOF
nasm -f elf32 /tmp/simples-test-hello.s -o /tmp/simples-test-hello.o 2>/dev/null
i686-linux-gnu-ld -m elf_i386 /tmp/simples-test-hello.o -o /tmp/simples-test-hello 2>/dev/null
chmod +x /tmp/simples-test-hello

BINARY_SIZE=$(stat -c%s /tmp/simples-test-hello)
ARCH=$(file /tmp/simples-test-hello | grep -o 'ELF 32-bit')
if [ "$ARCH" != "ELF 32-bit" ]; then
    fail "Binario de teste nao e ELF 32-bit"
else
    pass "Binario de teste: ELF 32-bit x86"
fi

echo ""
echo "--- 4. Execucao nativa (x86_64) ou via qemu (ARM64) ---"
HOST_ARCH=$(uname -m)
if [ "$HOST_ARCH" = "aarch64" ]; then
    docker run --rm --platform linux/amd64 \
        -v /tmp/simples-test-hello:/prog:ro \
        "$RUNNER_IMAGE" \
        sh -c "cp /prog /tmp/test && chmod +x /tmp/test && /tmp/test" 2>&1 || true

    docker run --rm \
        -v /tmp/simples-test-hello:/prog:ro \
        "$RUNNER_IMAGE" \
        sh -c "cp /prog /tmp/test && chmod +x /tmp/test && qemu-i386-static /tmp/test" 2>&1 | grep -q "Hello, World!" && {
        pass "Execucao via qemu-i386-static: Hello, World!"
    } || {
        fail "Execucao via qemu-i386-static falhou"
    }
else
    docker run --rm \
        -v /tmp/simples-test-hello:/prog:ro \
        "$RUNNER_IMAGE" \
        sh -c "cp /prog /tmp/test && chmod +x /tmp/test && /tmp/test" 2>&1 | grep -q "Hello, World!" && {
        pass "Execucao nativa x86_64: Hello, World!"
    } || {
        fail "Execucao nativa x86_64 falhou"
    }
fi

echo ""
echo "--- 5. Overhead de emulacao (ARM64) ---"
if [ "$HOST_ARCH" = "aarch64" ]; then
    docker run --rm \
        -v /tmp/simples-test-hello:/prog:ro \
        "$RUNNER_IMAGE" \
        sh -c "cp /prog /tmp/test && chmod +x /tmp/test && time -f '%e' /tmp/test" 2>/dev/null || true
fi

echo ""
echo "================================"
echo "Resultados: $PASS passed, $FAIL failed"
echo "================================"

rm -f /tmp/simples-test-hello /tmp/simples-test-hello.s /tmp/simples-test-hello.o
exit $FAIL
