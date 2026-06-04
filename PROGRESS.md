# Progress Tracker — Simples Editor

> Atualizado: 2026-06-03

## Sprint 1 — Fundação e Autenticação (0/7)

- [ ] feat(devops): setup Docker Compose structure
- [ ] feat(frontend): setup TanStack Start skeleton
- [ ] feat(backend): setup Flask app with health check
- [ ] feat(auth): integrate Supabase authentication
- [ ] feat(devops): configure Nginx reverse proxy
- [ ] feat(devops): setup CI/CD pipeline
- [ ] docs(readme): create initial documentation

## Sprint 2 — Editor e Compilador (0/6)

- [ ] feat(editor): add Monaco SIMPLES tokenizer
- [ ] feat(editor): integrate Monaco component
- [ ] feat(backend): compile endpoint with simplesc
- [ ] feat(backend): add nasm and ld toolchain
- [ ] feat(frontend): add NASM viewer panel
- [ ] feat(editor): highlight compile errors with markers

## Sprint 3 — Execução e Terminal (0/7)

- [ ] feat(backend): /ws/run WebSocket endpoint
- [ ] feat(backend): build sandbox runner image
- [ ] feat(backend): implement PtyExecutionStrategy
- [ ] feat(backend): add execution timeout handling
- [ ] feat(frontend): integrate xterm.js terminal
- [ ] feat(frontend): implement WebSocket client state machine
- [ ] feat(frontend): add Run and Stop buttons

## Sprint 4 — Segurança e Limites (0/6)

- [ ] feat(security): harden sandbox container
- [ ] feat(backend): add rate limiting
- [ ] feat(backend): add input validation
- [ ] feat(backend): implement three-layer timeouts
- [ ] feat(backend): add structured logging
- [ ] feat(backend): enhance health check endpoint

## Sprint 5 — Observabilidade e Deploy (0/6)

- [ ] feat(backend): add Prometheus metrics
- [ ] feat(devops): create Terraform for OCI Ampere A1
- [ ] feat(devops): deploy to OCI with TLS
- [ ] feat(backend): validate qemu-user on ARM64
- [ ] docs(deploy): create production deployment playbook
- [ ] feat(devops): configure monitoring and alerting

## Sprint 6 — Testes e Documentação (0/7)

- [ ] test(backend): add unit tests for compilation pipeline
- [ ] test(backend): add unit tests for execution strategy
- [ ] test(frontend): add component tests
- [ ] test(e2e): add Playwright tests for 7 canonical examples
- [ ] feat(frontend): add code examples dropdown
- [ ] docs(user): create student usage guide
- [ ] docs(video): create demo video

---

## Estatísticas

- **Total de issues**: 39
- **Concluídas**: 0
- **Em progresso**: 0
- **Pendentes**: 39
- **Progresso geral**: 0%

### Por Sprint

| Sprint | Issues | Concluídas | Progresso |
|---|---|---|---|
| Sprint 1 | 7 | 0 | 0% |
| Sprint 2 | 6 | 0 | 0% |
| Sprint 3 | 7 | 0 | 0% |
| Sprint 4 | 6 | 0 | 0% |
| Sprint 5 | 6 | 0 | 0% |
| Sprint 6 | 7 | 0 | 0% |

### Por Stack

| Stack | Issues |
|---|---|
| Frontend | 10 |
| Backend | 18 |
| DevOps | 9 |
| Docs | 4 |
| Security | 3 |

---

## Notas

- Atualizar checkboxes conforme issues forem fechadas no GitHub
- Números das issues (#1, #2, etc.) serão adicionados após criação
- Sincronizar com GitHub Projects se necessário
- Mover issues entre sprints via re-labeling se houver mudança de escopo
