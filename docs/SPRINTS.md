# Planejamento de Sprints — Simples Editor

> 6 sprints de 1 semana cada · Roadmap técnico para Web IDE SIMPLES

---

## Sprint 1 — Fundação e Autenticação (Semana 1)

**Objetivo**: Estrutura base do projeto, autenticação funcional, deploy inicial.

**Entregáveis**:
- Estrutura de repositório com Docker Compose
- Frontend skeleton (TanStack Start + Tailwind)
- Backend Flask básico com health check
- Autenticação Supabase (login/logout)
- Deploy local funcionando (`docker compose up`)
- CI/CD pipeline básico (GitHub Actions)

**Stack afetado**: frontend, backend, devops, docs

---

## Sprint 2 — Editor e Compilador (Semana 2)

**Objetivo**: Editor SIMPLES funcional, pipeline de compilação, painel NASM.

**Entregáveis**:
- Monaco Editor integrado com syntax highlighting SIMPLES (27 palavras reservadas)
- Painel NASM read-only com syntax highlighting Assembly
- Endpoint REST `/api/compile` que invoca `simplesc → nasm → ld`
- Erros de compilação com linha/coluna destacados no editor (Monaco markers)
- Splitter arrastável entre Editor e NASM
- Dockerfile do backend com toolchain cross-i386 (`binutils-i686-linux-gnu`)

**Stack afetado**: frontend, backend

---

## Sprint 3 — Execução e Terminal (Semana 3)

**Objetivo**: Execução em sandbox, terminal interativo via WebSocket.

**Entregáveis**:
- WebSocket `/ws/run` (handshake com JWT)
- Container sandbox (`simples-runner:latest` com `qemu-i386-static`)
- Bridge PTY → WebSocket (stdout/stderr em tempo real)
- Terminal xterm.js renderizando output
- Input via terminal (`leia`) funcional
- Timeout de execução (10s) com SIGTERM → SIGKILL
- Botão Stop funcional

**Stack afetado**: frontend, backend

---

## Sprint 4 — Segurança e Limites (Semana 4)

**Objetivo**: Hardening do sandbox, rate limiting, validações.

**Entregáveis**:
- Sandbox com todas as camadas de segurança (`--network=none`, `--read-only`, cgroups, seccomp)
- Rate limiting (30 exec/min por user, 120/min por IP)
- Input validation (64 KB max, caracteres válidos)
- Timeout em 3 camadas (compile 15s, exec 10s, Docker hard limit 12s)
- Health check detalhado (`/api/health` com status dos componentes)
- Logs estruturados em JSON (`structlog`)

**Stack afetado**: backend, devops, security

---

## Sprint 5 — Observabilidade e Deploy em Produção (Semana 5)

**Objetivo**: Métricas, logs, deploy OCI Ampere A1, TLS.

**Entregáveis**:
- Métricas Prometheus (`/metrics` endpoint)
- Deploy Oracle Cloud Ampere A1 (Ubuntu 22.04 ARM64)
- Terraform para provisionamento OCI
- Nginx reverse proxy com TLS (Let's Encrypt)
- Firewall OCI + iptables configurado
- Documentação de deploy (playbook completo)
- Validação de `qemu-user` em ARM64

**Stack afetado**: backend, devops

---

## Sprint 6 — Testes, Polimento e Documentação (Semana 6)

**Objetivo**: Cobertura de testes, UI/UX polido, docs para usuários.

**Entregáveis**:
- Testes unitários backend (pytest, cobertura ≥ 80%)
- Testes frontend (Vitest + React Testing Library)
- Testes E2E (Playwright) — 7 exemplos canônicos do PRD
- Dropdown de exemplos (hello, fatorial, fibonacci, tabuada)
- Mensagens de erro amigáveis
- README para alunos (como usar a IDE)
- README para desenvolvedores (como contribuir)
- Vídeo demo (2-3 min)

**Stack afetado**: frontend, backend, docs

---

## Critérios de Aceite Globais

- [ ] Todos os 6 sprints entregues
- [ ] 7 exemplos canônicos compilam e executam corretamente
- [ ] Deploy em OCI Ampere A1 funcionando com TLS
- [ ] Cobertura de testes ≥ 80% backend
- [ ] Documentação completa (dev + user)
- [ ] Sem bloqueadores críticos de segurança
- [ ] Latência p95 ≤ 2s (compile + link)
- [ ] Latência p95 ≤ 200ms (WebSocket round-trip)

---

## Dependências Externas

| Item | Status | Responsável |
|---|---|---|
| Compilador `simplesc` (C99) | ✅ Pronto | Equipe Compiladores |
| Conta Supabase (free tier) | ✅ Configurada | DevOps |
| Conta Oracle Cloud (free tier) | ⏳ Pendente | DevOps |
| Domínio DNS | ⏳ Pendente | Instituição |

---

## Notas Técnicas

### ARM64 (Oracle Cloud Ampere A1)
- Todas as imagens Docker são multi-arch (funcionam em x86_64 e ARM64)
- Binários SIMPLES são x86 32-bit (ELF i386) com syscalls `int 0x80`
- Execução em ARM64 via `qemu-i386-static` (overhead 5-10x, aceitável para escopo didático)
- `EXEC_TIMEOUT_S` ajustado para 15s em produção ARM

### Ferramentas Cross-Target
- **NASM**: cross-assembler nativo, funciona em qualquer CPU
- **binutils-i686-linux-gnu**: provê `i686-linux-gnu-ld` para linkar ELF i386 em qualquer host
- **qemu-user-static**: emula binários x86 em ARM64 (userland, sem VM completa)

---

## Riscos por Sprint

| Sprint | Risco Principal | Mitigação |
|---|---|---|
| 1 | Problemas de rede com Supabase | Usar mock auth em desenvolvimento |
| 2 | Compilador `simplesc` com bugs | Ter suite de testes do compilador rodando |
| 3 | PTY bridge complexo demais | Usar `docker SDK` attach_socket (abstração pronta) |
| 4 | Sandbox escape | Seguir checklist Docker security best practices |
| 5 | Overhead de emulação alto demais | Calibrar timeouts, alertar usuários de latência esperada |
| 6 | Testes E2E flaky | Rodar com retry, isolar estado entre testes |
