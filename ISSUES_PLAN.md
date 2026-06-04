# Plano Completo de Issues — Simples Editor

> Gerado em 2026-06-03 · Aguardando aprovação para execução via gh CLI

---

## 📋 PARTE 1: MILESTONES (6)

```bash
# Comandos para criar via gh api
gh api repos/:owner/:repo/milestones -f title="Sprint 1 — Fundação e Autenticação" -f due_on="2026-06-10T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 2 — Editor e Compilador" -f due_on="2026-06-17T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 3 — Execução e Terminal" -f due_on="2026-06-24T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 4 — Segurança e Limites" -f due_on="2026-07-01T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 5 — Observabilidade e Deploy" -f due_on="2026-07-08T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 6 — Testes e Documentação" -f due_on="2026-07-15T23:59:59Z" -f state="open"
```

---

## 🏷️ PARTE 2: LABELS (11)

```bash
# Sprints
gh label create "sprint-1" --color "0E8A16" --description "Sprint 1 — Fundação"
gh label create "sprint-2" --color "1D76DB" --description "Sprint 2 — Editor"
gh label create "sprint-3" --color "5319E7" --description "Sprint 3 — Execução"
gh label create "sprint-4" --color "E99695" --description "Sprint 4 — Segurança"
gh label create "sprint-5" --color "F9D0C4" --description "Sprint 5 — Observabilidade"
gh label create "sprint-6" --color "FEF2C0" --description "Sprint 6 — Testes"

# Tipos
gh label create "frontend" --color "D4C5F9" --description "Frontend (React/TanStack)"
gh label create "backend" --color "C5DEF5" --description "Backend (Flask/Python)"
gh label create "devops" --color "BFD4F2" --description "DevOps/Infra"
gh label create "docs" --color "FFC0CB" --description "Documentação"
gh label create "security" --color "B60205" --description "Segurança"
```

---

## 📝 PARTE 3: ISSUES

### Sprint 1 — Fundação e Autenticação (7 issues)

```bash
# Issue 1.1
gh issue create \
  --title "feat(devops): setup Docker Compose structure" \
  --body "## Contexto
Criar estrutura base do projeto com Docker Compose para desenvolvimento local e produção.

## Critérios de aceite
- [ ] docker-compose.yml com serviços: frontend, backend, nginx, runner_image_build
- [ ] Volumes configurados (simples_tmp, /var/run/docker.sock)
- [ ] Networks internas configuradas
- [ ] .env.example com todas as variáveis necessárias
- [ ] docker compose up sobe todos os serviços sem erros

## Stack afetado
devops

## Referências
- PRD §14 (Docker Compose)" \
  --label "sprint-1" \
  --label "devops" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.2
gh issue create \
  --title "feat(frontend): setup TanStack Start skeleton" \
  --body "## Contexto
Criar estrutura inicial do frontend com TanStack Start, Tailwind CSS e TypeScript.

## Critérios de aceite
- [ ] Projeto TanStack Start inicializado com TypeScript
- [ ] Tailwind CSS configurado
- [ ] Estrutura de pastas (/routes, /components, /lib)
- [ ] Dockerfile multi-stage (build + nginx serve)
- [ ] Build produz bundle otimizado
- [ ] Página inicial renderiza \"Simples Editor\"

## Stack afetado
frontend

## Referências
- PRD §8.1 (Frontend Stack)
- PRD §14.5 (frontend/Dockerfile)" \
  --label "sprint-1" \
  --label "frontend" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.3
gh issue create \
  --title "feat(backend): setup Flask app with health check" \
  --body "## Contexto
Criar aplicação Flask básica com endpoint de health check.

## Critérios de aceite
- [ ] Flask app inicializada com flask-sock
- [ ] Endpoint GET /api/health retorna JSON com status
- [ ] Estrutura de pastas (/app, /services, /routes)
- [ ] Dockerfile com Python 3.11
- [ ] Gunicorn com gevent worker
- [ ] Logs em stdout (formato JSON via structlog)

## Stack afetado
backend

## Referências
- PRD §8.2 (Backend Stack)
- PRD §9.1 (REST endpoints)" \
  --label "sprint-1" \
  --label "backend" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.4
gh issue create \
  --title "feat(auth): integrate Supabase authentication" \
  --body "## Contexto
Implementar autenticação via Supabase (JWT) no frontend e validação no backend.

## Critérios de aceite
- [ ] @supabase/supabase-js integrado no frontend
- [ ] Tela de login com @supabase/auth-ui-react
- [ ] JWT armazenado em localStorage
- [ ] Backend valida JWT em POST /api/auth/verify
- [ ] Middleware de autenticação para rotas protegidas
- [ ] Logout limpa sessão e redireciona

## Stack afetado
frontend, backend, security

## Referências
- PRD §5 RF01 (autenticação obrigatória)
- PRD §11.1 (Autenticação e autorização)" \
  --label "sprint-1" \
  --label "frontend" \
  --label "backend" \
  --label "security" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.5
gh issue create \
  --title "feat(devops): configure Nginx reverse proxy" \
  --body "## Contexto
Configurar Nginx como reverse proxy para frontend, backend REST e WebSocket.

## Critérios de aceite
- [ ] nginx.conf com upstreams (frontend, backend)
- [ ] Location / proxy para frontend
- [ ] Location /api/ proxy para backend
- [ ] Location /ws/ com WebSocket upgrade headers
- [ ] HTTP redireciona para HTTPS (produção)
- [ ] client_max_body_size 256k

## Stack afetado
devops

## Referências
- PRD §15 (Nginx — reverse proxy)" \
  --label "sprint-1" \
  --label "devops" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.6
gh issue create \
  --title "feat(devops): setup CI/CD pipeline" \
  --body "## Contexto
Criar pipeline básico de CI/CD no GitHub Actions.

## Critérios de aceite
- [ ] Workflow .github/workflows/ci.yml
- [ ] Job de lint (frontend e backend)
- [ ] Job de build Docker images
- [ ] Job de testes unitários (quando existirem)
- [ ] Badge de status no README
- [ ] Pipeline passa no main branch

## Stack afetado
devops

## Referências
- PRD §18 (Roadmap — Fase 1)" \
  --label "sprint-1" \
  --label "devops" \
  --milestone "Sprint 1 — Fundação e Autenticação"

# Issue 1.7
gh issue create \
  --title "docs(readme): create initial documentation" \
  --body "## Contexto
Documentar setup de desenvolvimento local.

## Critérios de aceite
- [ ] README.md com visão geral do projeto
- [ ] Seção \"Pré-requisitos\" (Docker, Docker Compose, gh CLI)
- [ ] Seção \"Setup local\" (clone, .env, docker compose up)
- [ ] Seção \"Arquitetura\" (diagrama de componentes)
- [ ] CONTRIBUTING.md com guia de contribuição
- [ ] LICENSE atualizado

## Stack afetado
docs

## Referências
- PRD §7 (Arquitetura)
- PRD §14.6 (Deployment local)" \
  --label "sprint-1" \
  --label "docs" \
  --milestone "Sprint 1 — Fundação e Autenticação"
```


### Sprint 2 — Editor e Compilador (6 issues)

```bash
# Issue 2.1
gh issue create \
  --title "feat(editor): add Monaco SIMPLES tokenizer" \
  --body "## Contexto
Registrar linguagem custom SIMPLES no Monaco Editor com syntax highlighting das 27 palavras reservadas.

## Critérios de aceite
- [ ] monaco.languages.register({ id: 'simples' })
- [ ] Tokenizer Monarch com 27 keywords
- [ ] Operators: <-, +, -, *, div, >, <, =, <>, >=, <=
- [ ] Numbers (inteiro e flutuante) destacados
- [ ] Tema dark customizado
- [ ] Editor renderiza código SIMPLES com cores

## Stack afetado
frontend

## Referências
- PRD §13 (Editor de código Monaco)
- PRD §13.1 (Linguagem custom simples)" \
  --label "sprint-2" \
  --label "frontend" \
  --milestone "Sprint 2 — Editor e Compilador"

# Issue 2.2
gh issue create \
  --title "feat(editor): integrate Monaco component" \
  --body "## Contexto
Criar componente React que encapsula Monaco Editor com configurações SIMPLES.

## Critérios de aceite
- [ ] Componente SimplesEditor com @monaco-editor/react
- [ ] Configuração: language='simples', theme='simples-dark'
- [ ] Props: value, onChange, readOnly
- [ ] Atalhos padrão funcionando (Ctrl+C/V/Z)
- [ ] Auto-indent e bracket matching
- [ ] Component renderiza no layout principal

## Stack afetado
frontend

## Referências
- PRD §12.1 (Layout desktop)
- PRD §13 (Editor de código)" \
  --label "sprint-2" \
  --label "frontend" \
  --milestone "Sprint 2 — Editor e Compilador"

# Issue 2.3
gh issue create \
  --title "feat(backend): compile endpoint with simplesc" \
  --body "## Contexto
Criar endpoint REST que invoca simplesc e retorna NASM ou erros de compilação.

## Critérios de aceite
- [ ] Endpoint POST /api/compile recebe { code: string }
- [ ] Cria diretório temporário /tmp/sim-<uuid>
- [ ] Invoca simplesc com subprocess.run(timeout=15)
- [ ] Retorna { asm: string } em sucesso
- [ ] Retorna { error, line, column, phase } em erro
- [ ] Limpa diretório temporário após execução

## Stack afetado
backend

## Referências
- PRD §7.3 (Fluxo de execução end-to-end)
- PRD §9.1 (REST endpoints)" \
  --label "sprint-2" \
  --label "backend" \
  --milestone "Sprint 2 — Editor e Compilador"

# Issue 2.4
gh issue create \
  --title "feat(backend): add nasm and ld toolchain" \
  --body "## Contexto
Integrar NASM e binutils-i686-linux-gnu no Dockerfile do backend para assembly e link cross-i386.

## Critérios de aceite
- [ ] Dockerfile instala nasm e binutils-i686-linux-gnu
- [ ] simplesc compilado dentro da imagem
- [ ] Script de build invoca nasm -f elf32
- [ ] Script de link invoca i686-linux-gnu-ld -m elf_i386
- [ ] Pipeline completo simplesc → nasm → ld funciona
- [ ] Binário ELF i386 gerado corretamente

## Stack afetado
backend, devops

## Referências
- PRD §8.3 (Compilador já existente)
- PRD §14.3 (backend/Dockerfile)" \
  --label "sprint-2" \
  --label "backend" \
  --label "devops" \
  --milestone "Sprint 2 — Editor e Compilador"

# Issue 2.5
gh issue create \
  --title "feat(frontend): add NASM viewer panel" \
  --body "## Contexto
Criar painel read-only para exibir assembly NASM gerado.

## Critérios de aceite
- [ ] Componente NasmViewer com Monaco readOnly
- [ ] Syntax highlighting para assembly (x86)
- [ ] Atualiza conteúdo quando recebe asm_generated
- [ ] Splitter arrastável entre Editor e NASM
- [ ] Double-click no splitter colapsa/expande NASM
- [ ] Estado do splitter persistido em localStorage

## Stack afetado
frontend

## Referências
- PRD §12.1 (Layout desktop)
- PRD §5 RF06 (painel NASM)" \
  --label "sprint-2" \
  --label "frontend" \
  --milestone "Sprint 2 — Editor e Compilador"

# Issue 2.6
gh issue create \
  --title "feat(editor): highlight compile errors with markers" \
  --body "## Contexto
Destacar linha/coluna de erros de compilação no Monaco Editor usando markers API.

## Critérios de aceite
- [ ] Recebe { line, column, message } de compile_error
- [ ] Cria Monaco marker com MarkerSeverity.Error
- [ ] Linha destacada em vermelho no gutter
- [ ] Hover sobre erro mostra mensagem
- [ ] Limpa markers ao iniciar nova compilação
- [ ] Funciona para erros de lexer, parser e semantic

## Stack afetado
frontend

## Referências
- PRD §5 RF08 (erros destacados)
- PRD §13.2 (Erros de compilação como markers)" \
  --label "sprint-2" \
  --label "frontend" \
  --milestone "Sprint 2 — Editor e Compilador"
```


### Sprint 3 — Execução e Terminal (7 issues)

```bash
# Issue 3.1
gh issue create \
  --title "feat(backend): /ws/run WebSocket endpoint" \
  --body "## Contexto
Criar endpoint WebSocket para compilação e execução com comunicação bidirecional.

## Critérios de aceite
- [ ] Endpoint /ws/run com flask-sock
- [ ] Handshake valida JWT (Sec-WebSocket-Protocol ou query ?token=)
- [ ] Máquina de estados: IDLE → COMPILING → EXECUTING → IDLE
- [ ] Recebe mensagens: compile_and_run, stdin, stop, ping
- [ ] Envia mensagens: compile_started, asm_generated, exec_started, stdout, exit
- [ ] Suporta múltiplas conexões concorrentes

## Stack afetado
backend

## Referências
- PRD §9.2 (WebSocket /ws/run)
- PRD §9.2.3 (Máquina de estados)" \
  --label "sprint-3" \
  --label "backend" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.2
gh issue create \
  --title "feat(backend): build sandbox runner image" \
  --body "## Contexto
Criar imagem Docker mínima para executar binários SIMPLES em sandbox isolado.

## Critérios de aceite
- [ ] Dockerfile baseado em debian:12-slim
- [ ] Instala qemu-user-static (emulação x86 em ARM64)
- [ ] Usuário nobody (65534:65534) criado
- [ ] Imagem < 100 MB
- [ ] Testa execução: docker run simples-runner /usr/bin/qemu-i386-static /sandbox/hello
- [ ] Funciona em hosts x86_64 e ARM64

## Stack afetado
backend, devops

## Referências
- PRD §14.4 (runner/Dockerfile)
- PRD §11.2 (Sandboxing por execução)" \
  --label "sprint-3" \
  --label "backend" \
  --label "devops" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.3
gh issue create \
  --title "feat(backend): implement PtyExecutionStrategy" \
  --body "## Contexto
Estratégia de execução que cria container Docker com PTY e faz bridge stdin/stdout via WebSocket.

## Critérios de aceite
- [ ] Classe PtyExecutionStrategy implementa padrão Strategy
- [ ] docker_client.containers.run com: --network=none, --read-only, --mem-limit=128m, --pids-limit=64
- [ ] container.attach_socket para bridge de I/O
- [ ] Duas tasks asyncio: pty_to_ws e ws_to_pty
- [ ] Envia { type: stdout, data } para cada chunk
- [ ] Recebe { type: stdin, data } e escreve no socket
- [ ] Container destruído após execução

## Stack afetado
backend

## Referências
- PRD §7.3 (Fluxo de execução end-to-end)
- PRD Apêndice B (PtyExecutionStrategy)" \
  --label "sprint-3" \
  --label "backend" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.4
gh issue create \
  --title "feat(backend): add execution timeout handling" \
  --body "## Contexto
Implementar timeout wall-clock de 10s para execução, com SIGTERM → SIGKILL escalation.

## Critérios de aceite
- [ ] asyncio.wait_for(execution_task, timeout=10)
- [ ] Ao timeout: container.kill(SIGTERM), aguarda 1s, container.kill(SIGKILL)
- [ ] Envia { type: timeout, limit_s: 10 } ao cliente
- [ ] Logs estruturados registram timeout com user_id
- [ ] Funciona mesmo com processos que ignoram SIGTERM
- [ ] Container é forçadamente removido após timeout

## Stack afetado
backend

## Referências
- PRD §5 RF14 (timeout 10s wall-clock)
- PRD §11.3 (Timeouts em três camadas)" \
  --label "sprint-3" \
  --label "backend" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.5
gh issue create \
  --title "feat(frontend): integrate xterm.js terminal" \
  --body "## Contexto
Adicionar terminal xterm.js que renderiza stdout/stderr e captura stdin.

## Critérios de aceite
- [ ] Componente Terminal com xterm.js + xterm-addon-fit
- [ ] Renderiza stdout/stderr recebidos via WebSocket
- [ ] onData captura input do usuário e envia { type: stdin }
- [ ] Terminal limpa ao iniciar nova execução
- [ ] Fit addon ajusta tamanho ao resize da janela
- [ ] Tema dark consistente com editor

## Stack afetado
frontend

## Referências
- PRD §8.1 (Frontend Stack — xterm.js)
- PRD §5 RF11 e RF12 (stdin/stdout interativo)" \
  --label "sprint-3" \
  --label "frontend" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.6
gh issue create \
  --title "feat(frontend): implement WebSocket client state machine" \
  --body "## Contexto
Gerenciar conexão WebSocket e estados da IDE (idle, compiling, executing).

## Critérios de aceite
- [ ] Hook useWebSocket com estados: disconnected, idle, compiling, executing
- [ ] Conecta ao /ws/run com JWT no handshake
- [ ] Reconecta automaticamente em caso de disconnect
- [ ] Dispara callbacks: onCompileError, onAsmGenerated, onStdout, onExit
- [ ] Envia compile_and_run(code), sendStdin(data), stop()
- [ ] Tratamento de erros com retry exponencial

## Stack afetado
frontend

## Referências
- PRD §9.2 (WebSocket /ws/run)
- PRD §12.3 (Estados visuais)" \
  --label "sprint-3" \
  --label "frontend" \
  --milestone "Sprint 3 — Execução e Terminal"

# Issue 3.7
gh issue create \
  --title "feat(frontend): add Run and Stop buttons" \
  --body "## Contexto
Botões de controle de execução com transição de estados correta.

## Critérios de aceite
- [ ] Botão Run: habilitado apenas em idle, envia compile_and_run
- [ ] Botão Stop: visível apenas em executing, envia stop
- [ ] Editor entra em readOnly durante compiling/executing
- [ ] Loading spinner durante compiling
- [ ] Exit code exibido no terminal após execução
- [ ] Mensagem de erro amigável para compile_error

## Stack afetado
frontend

## Referências
- PRD §12.2 (Comportamentos chave)
- PRD §5 RF04 e RF13 (Run e Stop)" \
  --label "sprint-3" \
  --label "frontend" \
  --milestone "Sprint 3 — Execução e Terminal"
```


### Sprint 4 — Segurança e Limites (6 issues)

```bash
# Issue 4.1
gh issue create \
  --title "feat(security): harden sandbox container" \
  --body "## Contexto
Aplicar todas as camadas de segurança do sandbox conforme threat model.

## Critérios de aceite
- [ ] --network=none (sem acesso rede)
- [ ] --read-only + tmpfs /tmp:size=8m
- [ ] --memory=128m --memory-swap=128m
- [ ] --cpu-quota=50000 (50% de 1 CPU)
- [ ] --pids-limit=64
- [ ] --user=65534:65534 (nobody)
- [ ] --cap-drop=ALL
- [ ] Seccomp profile padrão habilitado
- [ ] Testes de escape falham (fork bomb, network, filesystem write)

## Stack afetado
backend, security

## Referências
- PRD §11.2 (Sandboxing por execução)
- PRD §11.6 (Threat model)" \
  --label "sprint-4" \
  --label "backend" \
  --label "security" \
  --milestone "Sprint 4 — Segurança e Limites"

# Issue 4.2
gh issue create \
  --title "feat(backend): add rate limiting" \
  --body "## Contexto
Implementar rate limiting por user_id e por IP para prevenir abuso.

## Critérios de aceite
- [ ] flask-limiter integrado
- [ ] Limite: 30 execuções/minuto por user_id
- [ ] Limite: 120 execuções/minuto por IP
- [ ] Retorna HTTP 429 com Retry-After header
- [ ] Frontend exibe mensagem amigável ao usuário
- [ ] Logs registram eventos de rate limit

## Stack afetado
backend, security

## Referências
- PRD §5 RF18 (rate limiting 30/min)
- PRD §11.4 (Rate limiting)" \
  --label "sprint-4" \
  --label "backend" \
  --label "security" \
  --milestone "Sprint 4 — Segurança e Limites"

# Issue 4.3
gh issue create \
  --title "feat(backend): add input validation" \
  --body "## Contexto
Validar todo input do usuário antes de processar (código, stdin).

## Critérios de aceite
- [ ] Código ≤ 64 KB (rejeita acima)
- [ ] Código UTF-8 válido
- [ ] Stdin por mensagem ≤ 4 KB
- [ ] Caracteres permitidos: printables ASCII/extended + tab/newline/return
- [ ] Retorna HTTP 400 com mensagem clara
- [ ] Logs não vazam conteúdo do código (apenas tamanho)

## Stack afetado
backend, security

## Referências
- PRD §5 RF17 (código ≤ 64 KB)
- PRD §11.5 (Input validation)" \
  --label "sprint-4" \
  --label "backend" \
  --label "security" \
  --milestone "Sprint 4 — Segurança e Limites"

# Issue 4.4
gh issue create \
  --title "feat(backend): implement three-layer timeouts" \
  --body "## Contexto
Timeouts em três camadas: compilação, execução wall-clock, hard limit Docker.

## Critérios de aceite
- [ ] Camada 1: subprocess.run(timeout=15) para simplesc/nasm/ld separadamente
- [ ] Camada 2: asyncio.wait_for(exec_task, timeout=10) com SIGTERM→SIGKILL
- [ ] Camada 3: docker run --stop-timeout=12
- [ ] Cada timeout logado com fase, user_id, duration
- [ ] Cliente recebe mensagem específica por tipo de timeout
- [ ] Testes cobrem os 3 cenários

## Stack afetado
backend

## Referências
- PRD §11.3 (Timeouts em três camadas)
- PRD §5 RF14 e RF15 (timeouts exec e compile)" \
  --label "sprint-4" \
  --label "backend" \
  --milestone "Sprint 4 — Segurança e Limites"

# Issue 4.5
gh issue create \
  --title "feat(backend): add structured logging" \
  --body "## Contexto
Substituir logs simples por logs estruturados em JSON via structlog.

## Critérios de aceite
- [ ] structlog configurado com JSONRenderer
- [ ] Campos fixos: timestamp, level, logger, event, request_id
- [ ] user_id hasheado (não em plaintext)
- [ ] Logs de compilação: phase, duration_ms, exit_code
- [ ] Logs de execução: outcome (success/timeout/error), duration_ms
- [ ] stdout não contém PII
- [ ] Logs testáveis via caplog

## Stack afetado
backend

## Referências
- PRD §16.1 (Logs estruturados JSON)
- PRD §6.2 (Segurança — logs sem PII)" \
  --label "sprint-4" \
  --label "backend" \
  --milestone "Sprint 4 — Segurança e Limites"

# Issue 4.6
gh issue create \
  --title "feat(backend): enhance health check endpoint" \
  --body "## Contexto
Expandir /api/health para verificar status de todos os componentes.

## Critérios de aceite
- [ ] Retorna { status, version, components: { compiler, nasm, docker, supabase } }
- [ ] Verifica simplesc --version
- [ ] Verifica nasm --version
- [ ] Verifica docker info (conectividade)
- [ ] Verifica Supabase JWT_SECRET configurado
- [ ] Status: healthy/degraded/unhealthy
- [ ] Tempo de resposta < 500ms

## Stack afetado
backend

## Referências
- PRD §5 RF20 (health check endpoint)
- PRD §16.3 (Health check)" \
  --label "sprint-4" \
  --label "backend" \
  --milestone "Sprint 4 — Segurança e Limites"
```


### Sprint 5 — Observabilidade e Deploy (6 issues)

```bash
# Issue 5.1
gh issue create \
  --title "feat(backend): add Prometheus metrics" \
  --body "## Contexto
Expor métricas de performance e saúde via Prometheus client.

## Critérios de aceite
- [ ] prometheus-client integrado
- [ ] Endpoint /metrics (bloqueado no Nginx externamente)
- [ ] Histogram: simples_compile_duration_seconds (labels: phase)
- [ ] Histogram: simples_execution_duration_seconds (labels: outcome)
- [ ] Counter: simples_executions_total (labels: outcome)
- [ ] Gauge: simples_active_sandboxes
- [ ] Counter: simples_compile_errors_total (labels: phase)
- [ ] Gauge: simples_websocket_connections

## Stack afetado
backend

## Referências
- PRD §16.2 (Métricas Prometheus)" \
  --label "sprint-5" \
  --label "backend" \
  --milestone "Sprint 5 — Observabilidade e Deploy"

# Issue 5.2
gh issue create \
  --title "feat(devops): create Terraform for OCI Ampere A1" \
  --body "## Contexto
Provisionamento automatizado da VM Oracle Cloud via Terraform.

## Critérios de aceite
- [ ] terraform/main.tf com provider OCI
- [ ] VCN, subnet, internet gateway, route table configurados
- [ ] Security list: SSH (22), HTTP (80), HTTPS (443)
- [ ] Compute instance: VM.Standard.A1.Flex, 2 OCPU, 12 GB RAM
- [ ] Ubuntu 22.04 ARM64 image
- [ ] cloud-init.yaml com bootstrap Docker
- [ ] Output: public_ip
- [ ] terraform apply cria ambiente completo

## Stack afetado
devops

## Referências
- PRD §14.7 (Deployment OCI Ampere A1)
- PRD Apêndice F (Terraform)" \
  --label "sprint-5" \
  --label "devops" \
  --milestone "Sprint 5 — Observabilidade e Deploy"

# Issue 5.3
gh issue create \
  --title "feat(devops): deploy to OCI with TLS" \
  --body "## Contexto
Deploy completo em Oracle Cloud com certificado Let's Encrypt.

## Critérios de aceite
- [ ] Aplicação rodando em OCI Ampere A1 (ARM64)
- [ ] docker compose up funciona end-to-end
- [ ] Certbot emite certificado Let's Encrypt
- [ ] Nginx configurado com TLS 1.2/1.3
- [ ] HTTP redireciona para HTTPS
- [ ] Domínio acessível publicamente
- [ ] Auto-renovação de certificado via cron
- [ ] Firewall iptables liberado (80, 443)

## Stack afetado
devops

## Referências
- PRD §14.7.5 (TLS via Let's Encrypt)
- PRD §15 (Nginx reverse proxy)" \
  --label "sprint-5" \
  --label "devops" \
  --milestone "Sprint 5 — Observabilidade e Deploy"

# Issue 5.4
gh issue create \
  --title "feat(backend): validate qemu-user on ARM64" \
  --body "## Contexto
Garantir que execução de binários x86 via qemu-i386-static funciona corretamente em ARM64.

## Critérios de aceite
- [ ] Runner image build em host ARM64
- [ ] qemu-i386-static invocado explicitamente
- [ ] 7 exemplos canônicos executam corretamente
- [ ] Overhead medido: latência adicional < 100ms para programas simples
- [ ] EXEC_TIMEOUT_S ajustado para 15s em produção
- [ ] Logs indicam arquitetura do host (x86_64 ou aarch64)

## Stack afetado
backend, devops

## Referências
- PRD §2.2 (Premissas técnicas — emulação ARM64)
- PRD §14.4 (runner/Dockerfile com qemu)" \
  --label "sprint-5" \
  --label "backend" \
  --label "devops" \
  --milestone "Sprint 5 — Observabilidade e Deploy"

# Issue 5.5
gh issue create \
  --title "docs(deploy): create production deployment playbook" \
  --body "## Contexto
Documentar passo-a-passo completo para deploy de produção.

## Critérios de aceite
- [ ] DEPLOY.md com pré-requisitos (conta OCI, Supabase, domínio)
- [ ] Seção \"Provisionamento via Terraform\"
- [ ] Seção \"Bootstrap do host\" (Docker, iptables)
- [ ] Seção \"Deploy da aplicação\" (clone, .env, docker compose up)
- [ ] Seção \"Configuração TLS\" (certbot)
- [ ] Seção \"Verificação\" (health check, smoke tests)
- [ ] Troubleshooting de problemas comuns
- [ ] Checklist de validação pós-deploy

## Stack afetado
docs, devops

## Referências
- PRD §14.7 (Deployment OCI)
- PRD §14.7.2 (iptables crítico)" \
  --label "sprint-5" \
  --label "docs" \
  --label "devops" \
  --milestone "Sprint 5 — Observabilidade e Deploy"

# Issue 5.6
gh issue create \
  --title "feat(devops): configure monitoring and alerting" \
  --body "## Contexto
Setup básico de monitoramento para produção.

## Critérios de aceite
- [ ] Script de coleta de métricas do /metrics endpoint
- [ ] Alerta: simples_active_sandboxes > 50 (capacidade)
- [ ] Alerta: taxa de compile_errors > 50% (possível bug)
- [ ] Alerta: disco > 80% (limpeza necessária)
- [ ] Cron diário: docker container prune
- [ ] Logs centralizados (stdout capturado pelo Docker logging)
- [ ] Dashboard básico (Grafana opcional, Prometheus obrigatório)

## Stack afetado
devops

## Referências
- PRD §16 (Observabilidade)
- PRD §6.5 (Observabilidade)" \
  --label "sprint-5" \
  --label "devops" \
  --milestone "Sprint 5 — Observabilidade e Deploy"
```


### Sprint 6 — Testes e Documentação (7 issues)

```bash
# Issue 6.1
gh issue create \
  --title "test(backend): add unit tests for compilation pipeline" \
  --body "## Contexto
Cobertura de testes unitários para o pipeline simplesc → nasm → ld.

## Critérios de aceite
- [ ] pytest configurado com cobertura
- [ ] Testes: CompilerService.compile() com fixtures de código SIMPLES
- [ ] Testes: tratamento de erros de lexer/parser/semantic
- [ ] Testes: validação de input (tamanho, encoding)
- [ ] Testes: timeout de compilação
- [ ] Cobertura ≥ 80% em services/compiler.py
- [ ] CI executa testes automaticamente

## Stack afetado
backend

## Referências
- PRD §17.1 (Backend pytest)
- PRD §20 (Critérios de aceite)" \
  --label "sprint-6" \
  --label "backend" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.2
gh issue create \
  --title "test(backend): add unit tests for execution strategy" \
  --body "## Contexto
Testes do PtyExecutionStrategy e sandbox.

## Critérios de aceite
- [ ] Testes: PtyExecutionStrategy.execute() com programa hello world
- [ ] Testes: timeout de execução (SIGTERM → SIGKILL)
- [ ] Testes: stop via WebSocket
- [ ] Testes: input/output via bridge PTY
- [ ] Testes: container cleanup após execução
- [ ] Mocks de docker SDK para testes isolados
- [ ] Cobertura ≥ 80% em services/execution.py

## Stack afetado
backend

## Referências
- PRD §17.1 (Backend pytest)
- PRD Apêndice B (PtyExecutionStrategy)" \
  --label "sprint-6" \
  --label "backend" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.3
gh issue create \
  --title "test(frontend): add component tests" \
  --body "## Contexto
Testes dos componentes React principais com Vitest + React Testing Library.

## Critérios de aceite
- [ ] Vitest configurado com jsdom
- [ ] Testes: SimplesEditor renderiza e aceita digitação
- [ ] Testes: Monaco markers aparecem em compile_error
- [ ] Testes: Terminal renderiza stdout
- [ ] Testes: Botões Run/Stop habilitam/desabilitam corretamente
- [ ] Testes: useWebSocket transiciona estados
- [ ] Cobertura ≥ 70% em components/

## Stack afetado
frontend

## Referências
- PRD §17.2 (Frontend Vitest)" \
  --label "sprint-6" \
  --label "frontend" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.4
gh issue create \
  --title "test(e2e): add Playwright tests for 7 canonical examples" \
  --body "## Contexto
Testes end-to-end que validam os 7 exemplos canônicos do PRD do compilador.

## Critérios de aceite
- [ ] Playwright configurado
- [ ] Teste: hello world (escreva)
- [ ] Teste: atribuição e expressões aritméticas
- [ ] Teste: leia + escreva (input interativo)
- [ ] Teste: se/entao/senao
- [ ] Teste: enquanto
- [ ] Teste: para/de/ate/passo
- [ ] Teste: fatorial (programa completo)
- [ ] Todos passam em ambiente local e CI

## Stack afetado
frontend, backend

## Referências
- PRD §17.3 (E2E Playwright)
- PRD §20 (Critérios de aceite — 7 exemplos)" \
  --label "sprint-6" \
  --label "frontend" \
  --label "backend" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.5
gh issue create \
  --title "feat(frontend): add code examples dropdown" \
  --body "## Contexto
Dropdown com exemplos prontos para facilitar experimentação.

## Critérios de aceite
- [ ] Dropdown no toolbar com 7 exemplos
- [ ] Exemplos: hello, atribuicao, leia_escreva, se, enquanto, para, fatorial
- [ ] Click carrega código no editor
- [ ] Confirma se há código não salvo antes de trocar
- [ ] Exemplos validados (compilam e executam corretamente)
- [ ] UI responsiva e acessível

## Stack afetado
frontend

## Referências
- PRD §12.2 (Botão exemplos)
- PRD §13.3 (Snippets)" \
  --label "sprint-6" \
  --label "frontend" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.6
gh issue create \
  --title "docs(user): create student usage guide" \
  --body "## Contexto
Documentação para alunos usarem a IDE.

## Critérios de aceite
- [ ] USER_GUIDE.md com introdução à IDE
- [ ] Seção \"Como fazer login\"
- [ ] Seção \"Escrevendo código SIMPLES\"
- [ ] Seção \"Compilando e executando\"
- [ ] Seção \"Usando o terminal (leia/escreva)\"
- [ ] Seção \"Entendendo o assembly gerado\"
- [ ] FAQ: erros comuns, timeouts, rate limit
- [ ] Screenshots da interface

## Stack afetado
docs

## Referências
- PRD §18 Fase 2 (Documentação para alunos)" \
  --label "sprint-6" \
  --label "docs" \
  --milestone "Sprint 6 — Testes e Documentação"

# Issue 6.7
gh issue create \
  --title "docs(video): create demo video" \
  --body "## Contexto
Vídeo curto demonstrando funcionalidades principais.

## Critérios de aceite
- [ ] Vídeo 2-3 minutos
- [ ] Demonstra: login, escrever código, compilar, ver NASM, executar, input via leia
- [ ] Mostra tratamento de erro de compilação
- [ ] Mostra timeout de loop infinito
- [ ] Editado com legendas
- [ ] Publicado no YouTube e link no README
- [ ] Thumbnail atraente

## Stack afetado
docs

## Referências
- PRD §18 Fase 2 (Vídeo demo)" \
  --label "sprint-6" \
  --label "docs" \
  --milestone "Sprint 6 — Testes e Documentação"
```


```

---

## 📊 PARTE 4: PROGRESS.md

Arquivo para tracking manual das issues:

\`\`\`markdown
# Progress Tracker — Simples Editor

> Atualizado: 2026-06-03

## Sprint 1 — Fundação e Autenticação (0/7)

- [ ] #1 feat(devops): setup Docker Compose structure
- [ ] #2 feat(frontend): setup TanStack Start skeleton
- [ ] #3 feat(backend): setup Flask app with health check
- [ ] #4 feat(auth): integrate Supabase authentication
- [ ] #5 feat(devops): configure Nginx reverse proxy
- [ ] #6 feat(devops): setup CI/CD pipeline
- [ ] #7 docs(readme): create initial documentation

## Sprint 2 — Editor e Compilador (0/6)

- [ ] #8 feat(editor): add Monaco SIMPLES tokenizer
- [ ] #9 feat(editor): integrate Monaco component
- [ ] #10 feat(backend): compile endpoint with simplesc
- [ ] #11 feat(backend): add nasm and ld toolchain
- [ ] #12 feat(frontend): add NASM viewer panel
- [ ] #13 feat(editor): highlight compile errors with markers

## Sprint 3 — Execução e Terminal (0/7)

- [ ] #14 feat(backend): /ws/run WebSocket endpoint
- [ ] #15 feat(backend): build sandbox runner image
- [ ] #16 feat(backend): implement PtyExecutionStrategy
- [ ] #17 feat(backend): add execution timeout handling
- [ ] #18 feat(frontend): integrate xterm.js terminal
- [ ] #19 feat(frontend): implement WebSocket client state machine
- [ ] #20 feat(frontend): add Run and Stop buttons

## Sprint 4 — Segurança e Limites (0/6)

- [ ] #21 feat(security): harden sandbox container
- [ ] #22 feat(backend): add rate limiting
- [ ] #23 feat(backend): add input validation
- [ ] #24 feat(backend): implement three-layer timeouts
- [ ] #25 feat(backend): add structured logging
- [ ] #26 feat(backend): enhance health check endpoint

## Sprint 5 — Observabilidade e Deploy (0/6)

- [ ] #27 feat(backend): add Prometheus metrics
- [ ] #28 feat(devops): create Terraform for OCI Ampere A1
- [ ] #29 feat(devops): deploy to OCI with TLS
- [ ] #30 feat(backend): validate qemu-user on ARM64
- [ ] #31 docs(deploy): create production deployment playbook
- [ ] #32 feat(devops): configure monitoring and alerting

## Sprint 6 — Testes e Documentação (0/7)

- [ ] #33 test(backend): add unit tests for compilation pipeline
- [ ] #34 test(backend): add unit tests for execution strategy
- [ ] #35 test(frontend): add component tests
- [ ] #36 test(e2e): add Playwright tests for 7 canonical examples
- [ ] #37 feat(frontend): add code examples dropdown
- [ ] #38 docs(user): create student usage guide
- [ ] #39 docs(video): create demo video

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

- Números das issues serão preenchidos após criação via gh CLI
- Atualizar checkboxes conforme issues forem fechadas
- Mover issues entre sprints se necessário via labels
\`\`\`

---

## 🚀 INSTRUÇÕES DE EXECUÇÃO

Após aprovação, executar os seguintes scripts na ordem:

### 1. Criar milestones

```bash
#!/bin/bash
# create_milestones.sh

gh api repos/:owner/:repo/milestones -f title="Sprint 1 — Fundação e Autenticação" -f due_on="2026-06-10T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 2 — Editor e Compilador" -f due_on="2026-06-17T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 3 — Execução e Terminal" -f due_on="2026-06-24T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 4 — Segurança e Limites" -f due_on="2026-07-01T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 5 — Observabilidade e Deploy" -f due_on="2026-07-08T23:59:59Z" -f state="open"
gh api repos/:owner/:repo/milestones -f title="Sprint 6 — Testes e Documentação" -f due_on="2026-07-15T23:59:59Z" -f state="open"
```

### 2. Criar labels

```bash
#!/bin/bash
# create_labels.sh

gh label create "sprint-1" --color "0E8A16" --description "Sprint 1 — Fundação" --force
gh label create "sprint-2" --color "1D76DB" --description "Sprint 2 — Editor" --force
gh label create "sprint-3" --color "5319E7" --description "Sprint 3 — Execução" --force
gh label create "sprint-4" --color "E99695" --description "Sprint 4 — Segurança" --force
gh label create "sprint-5" --color "F9D0C4" --description "Sprint 5 — Observabilidade" --force
gh label create "sprint-6" --color "FEF2C0" --description "Sprint 6 — Testes" --force
gh label create "frontend" --color "D4C5F9" --description "Frontend (React/TanStack)" --force
gh label create "backend" --color "C5DEF5" --description "Backend (Flask/Python)" --force
gh label create "devops" --color "BFD4F2" --description "DevOps/Infra" --force
gh label create "docs" --color "FFC0CB" --description "Documentação" --force
gh label create "security" --color "B60205" --description "Segurança" --force
```

### 3. Criar todas as issues

Extrair todos os comandos `gh issue create` da seção PARTE 3 acima e executar sequencialmente.

**Dica**: Copiar todo o conteúdo dos blocos bash de cada sprint e executar em um script:

```bash
#!/bin/bash
# create_all_issues.sh

# Sprint 1
gh issue create --title "feat(devops): setup Docker Compose structure" ...
# ... (todos os comandos)

# Sprint 2
gh issue create --title "feat(editor): add Monaco SIMPLES tokenizer" ...
# ... (continuar)
```

### 4. Criar PROGRESS.md

Copiar o markdown da PARTE 4 acima para um arquivo `PROGRESS.md` na raiz do repositório.

---

## ✅ CHECKLIST DE VALIDAÇÃO

Antes de executar:

- [ ] Revisei todos os títulos de issues (Conventional Commits corretos?)
- [ ] Revisei todos os critérios de aceite
- [ ] Confirmo que labels existem no plano
- [ ] Confirmo que milestones têm datas corretas
- [ ] Tenho permissões para criar issues no repositório
- [ ] `gh auth status` está verde
- [ ] Conheço o owner/repo correto para substituir em `:owner/:repo`

Após execução:

- [ ] Todas as 39 issues foram criadas
- [ ] Milestones aparecem no GitHub
- [ ] Labels estão aplicadas corretamente
- [ ] PROGRESS.md foi commitado e pushed
- [ ] Primeira issue do Sprint 1 pode ser atribuída e iniciada

---

## 📋 RESUMO FINAL

- **6 Milestones** (um por sprint, datas de 2026-06-10 a 2026-07-15)
- **11 Labels** (6 de sprint + 5 de tipo)
- **39 Issues** distribuídas em 6 sprints
- **PROGRESS.md** para tracking manual

**Total estimado**: 6 semanas de trabalho (1 sprint/semana)

**Próximo passo**: Aguardando sua aprovação para executar os comandos gh CLI.
