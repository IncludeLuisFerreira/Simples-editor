# PRD — Sprint 3: Execução e Terminal WebSocket
## Simples Editor — IDE Web para Linguagem SIMPLES

> **Data:** 2026-06-15  
> **Sprint:** 3 de 6  
> **Status:** Próxima a iniciar (Sprint 2 ✅ completa)  
> **Contexto anterior:** Sprint 1 (infraestrutura + auth), Sprint 2 (editor + compilação completa)

---

## 📋 Sumário Executivo

Sprint 3 completa o pipeline de compilação com **execução de binários em sandbox** e um **terminal interativo via WebSocket + PTY**. O aluno vai poder:

1. Escrever código SIMPLES
2. Compilar (simplesc → nasm → ld) — **já funciona em Sprint 2** ✅
3. **Executar o binário em container isolado** ← novo em Sprint 3
4. **Interagir via terminal** (`leia` para input, `escreva` para output) ← novo
5. **Parar execução** com botão Stop (SIGTERM/SIGKILL)

---

## 📁 Arquivos de Contexto — Leia ANTES de iniciar

### Documentação do projeto (ordem recomendada)

| # | Arquivo | Propósito | Quando ler |
|---|---------|----------|-----------|
| 1 | [`prd-simples-online.md`](../prd-simples-online.md) | Vision + requisitos do projeto inteiro | Inicio (seções 1-7, 9-11) |
| 2 | [`PROGRESS.md`](../PROGRESS.md) | Status de todas as sprints | Entender o contexto atual (Sprint 2 ✅, Sprint 3 pendente) |
| 3 | [`docs/superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md`](./superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md) | Design de Sprint 2 (já fechada) | Referência: arquitetura de compilação |
| 4 | [`docs/superpowers/plans/2026-06-12-sprint2-editor-compiler.md`](./superpowers/plans/2026-06-12-sprint2-editor-compiler.md) | Plano de Sprint 2 (já executado) | Padrão de qualidade esperado (TDD, 7-task format) |
| 5 | [`DOCKER_SETUP.md`](../DOCKER_SETUP.md) | Setup Docker local | Como rodar a aplicação |
| 6 | [`CONTRIBUTING.md`](../CONTRIBUTING.md) | Convenções de commit + dev | Padrão de commits (feat/fix/chore) |
| 7 | [`README.md`](../README.md) | Overview técnico | Entender arquitetura geral |

### Arquivos técnicos do projeto (por componente)

#### Backend (Python/Flask)

| Arquivo | Propósito | Crítico para Sprint 3? |
|---------|----------|----------------------|
| [`backend/app/routes/compile.py`](../backend/app/routes/compile.py) | Endpoint POST /api/compile (TDD 2) | Ref: padrão de rota + logging |
| [`backend/app/services/compiler.py`](../backend/app/services/compiler.py) | CompilerService (TDD 1) | Ref: padrão de service + CompileResult dataclass |
| [`backend/tests/test_compile_route.py`](../backend/tests/test_compile_route.py) | Testes de rota (11 tests) | Ref: padrão de testes Flask + mocks |
| [`backend/tests/test_compiler_service.py`](../backend/tests/test_compiler_service.py) | Testes de service (12 tests) | Ref: TDD pattern com pytest |
| [`backend/app/middleware/auth.py`](../backend/app/middleware/auth.py) | Middleware require_auth | **Deve ser usado em /ws/run** |
| [`backend/.env.example`](../backend/.env.example) | Variáveis de ambiente | Verificar configuração esperada |
| `backend/app/routes/execution.py` | **NOVO em Sprint 3** | Criar este arquivo com rota /ws/run |
| `backend/app/strategies/execution.py` | **NOVO em Sprint 3** | Criar strategy PtyExecutionStrategy |
| `backend/tests/test_execution_strategy.py` | **NOVO em Sprint 3** | TDD: testes de execução isolada |

#### Frontend (React/TypeScript)

| Arquivo | Propósito | Crítico para Sprint 3? |
|---------|----------|----------------------|
| [`frontend/src/components/SimplesEditor.tsx`](../frontend/src/components/SimplesEditor.tsx) | Editor com markers (Sprint 2) | Ref: padrão de componente React + useEffect |
| [`frontend/src/components/NasmPanel.tsx`](../frontend/src/components/NasmPanel.tsx) | Painel NASM read-only (Sprint 2) | Ref: Monaco read-only editor |
| [`frontend/src/routes/index.tsx`](../frontend/src/routes/index.tsx) | Layout principal com state machine (Sprint 2) | **Modificar: adicionar Terminal + botão Stop** |
| [`frontend/src/lib/auth.ts`](../frontend/src/lib/auth.ts) | Hook useAuth + Supabase JWT | **Usar para WebSocket auth** |
| `frontend/src/components/Terminal.tsx` | **NOVO em Sprint 3** | Terminal interativo com xterm.js |
| `frontend/src/hooks/useExecution.ts` | **NOVO em Sprint 3** | Hook para gerenciar WebSocket + PTY |

#### Infraestrutura

| Arquivo | Propósito | Crítico para Sprint 3? |
|---------|----------|----------------------|
| [`docker-compose.yml`](../docker-compose.yml) | Composição de serviços | Verificar: backend expõe porta 5000 ✅ |
| [`nginx/nginx.dev.conf`](../nginx/nginx.dev.conf) | Proxy reverso dev | Verificar: /ws/ já rota para backend ✅ |
| [`runner/Dockerfile`](../runner/Dockerfile) | Imagem sandbox (`simples-runner:latest`) | **Análise:** container de execução isolada |

---

## 🎯 Escopo Sprint 3

### Requisitos funcionais (do PRD principal)

| RF# | Requisito | Status |
|-----|-----------|--------|
| RF04 | Ao clicar Run, código vai pro backend | ✅ Sprint 2 |
| RF05 | Backend invoca simplesc → retorna .asm ou erro | ✅ Sprint 2 |
| RF09 | Backend monta (nasm) + linka (ld) binário | ✅ Sprint 2 |
| **RF10** | **Binário executado em container Docker descartável** | ← Sprint 3 |
| **RF11** | **Saída padrão transmitida em tempo real ao terminal** | ← Sprint 3 |
| **RF12** | **Usuário digita no terminal → input pro stdin do binário** | ← Sprint 3 |
| **RF13** | **Botão Stop envia SIGTERM, depois SIGKILL após 1s** | ← Sprint 3 |
| **RF14** | **Execução interrompida automaticamente após 10s** | ← Sprint 3 |
| RF15 | Compilação interrompida após 15s | ✅ Sprint 2 |

### Issues GitHub para Sprint 3

```
#21 feat(backend): /ws/run WebSocket endpoint
#22 feat(backend): build sandbox runner image
#23 feat(backend): implement PtyExecutionStrategy
#24 feat(backend): add execution timeout handling
#25 feat(frontend): integrate xterm.js terminal
#26 feat(frontend): implement WebSocket client state machine
#27 feat(frontend): add Run and Stop buttons
```

---

## 🏗️ Arquitetura Sprint 3

### Fluxo de Execução

```
[Frontend]
   ↓ (código já compilado em Sprint 2)
   ├─ clica Run
   ├─ WebSocket open: GET /ws/run?token=<jwt>
   ├─ envia: { "type": "execute", "phase": "run" }
   │
[Backend — /ws/run]
   ├─ validar JWT (middleware auth)
   ├─ criar tmpdir + copiar binário ali
   ├─ spawn docker container: `docker run --rm simples-runner:latest ./programa`
   ├─ anexar PTY ao processo (pty-spawn)
   ├─ loop: ler stdout → enviar ao WebSocket
   │
[Container sandbox]
   ├─ usuário escreve "5" no terminal → stdin do ./programa
   ├─ ./programa lê (leia), processa, escreve (escreva)
   ├─ stdout → Backend → WebSocket → Terminal Frontend
   │
[Frontend — Terminal]
   ├─ mostra output em tempo real
   ├─ usuário digita → envia ao backend via WebSocket
   ├─ clica Stop → envia SIGTERM
   │
[Backend]
   ├─ recebe SIGTERM → ps.kill('SIGTERM')
   ├─ aguarda 1s
   ├─ se ainda vivo → ps.kill('SIGKILL')
   ├─ fecha WebSocket + limpa tmpdir
```

### Componentes novos

#### Backend

**Arquivo:** `backend/app/routes/execution.py`
- Rota WebSocket: `GET /ws/run`
- Autenticação com `@require_auth` (já existe em Sprint 2)
- Validação do JWT no handshake
- Managers: `ExecutionManager` para coordenar container + PTY

**Arquivo:** `backend/app/strategies/execution.py`
- Classe: `PtyExecutionStrategy`
- Métodos: `spawn_process()`, `read_output()`, `write_input()`, `terminate()`, `kill()`
- Integração com `docker run --rm` (container descartável)
- Captura de stdout/stderr via PTY

**Arquivo:** `backend/tests/test_execution_strategy.py`
- TDD: 8+ testes
- Testes simulam execução, input/output, timeout, SIGTERM/SIGKILL

#### Frontend

**Arquivo:** `frontend/src/components/Terminal.tsx`
- Componente novo: Terminal interativo
- Usa `xterm.js` (já instalado? verificar package.json)
- Estilos: fundo preto, fonte monospace, scroll, bell sound (opcional)

**Arquivo:** `frontend/src/hooks/useExecution.ts`
- Hook novo: gerencia WebSocket `/ws/run`
- Estados: idle → running → finished
- Trata eventos: data (output), error, close
- Métodos: `execute()`, `sendInput()`, `stop()`

**Arquivo:** `frontend/src/routes/index.tsx`
- Modificar: adicionar Terminal na zona inferior
- Modificar: botão Run → muda para Stop durante execução
- Modificar: layout 3-painéis (Editor | NASM | Terminal)

---

## 📊 Matriz de testes esperados

### Backend — PtyExecutionStrategy (8-10 testes)

```python
class TestPtyExecutionStrategy:
    def test_spawn_success_with_echo_program():
        # Cria container, spawna echo "test", captura output
        
    def test_stdin_input_propagates():
        # Envia "42" via stdin, verifica output contém "42"
        
    def test_timeout_after_10s():
        # Programa sleep 30s, após 10s env interrompe
        
    def test_sigterm_then_sigkill():
        # Envia SIGTERM, aguarda 1s, verifica se morreu, se não manda SIGKILL
        
    def test_exit_code_captured():
        # Programa exit(42), verifica exit_code == 42
        
    def test_stderr_separated_from_stdout():
        # Escreve para stderr, valida que chegou em campo diferente
        
    def test_container_cleanup():
        # Após término, verifica que container foi removido
        
    def test_docker_run_command_format():
        # Valida que docker run tem flags corretas (--rm, -m, -c, --network=none)
```

### Frontend — Terminal.tsx e useExecution.ts (integration tests)

```tsx
- Terminal renders xterm.js
- WebSocket connects with JWT
- Output appears in real time
- Input typed → sent to backend
- Stop button sends SIGTERM
- Connection closes cleanly
- Exit code displayed
```

---

## 💾 Exemplo de programa SIMPLES para testar

### Exemplo 1: Echo (leia → escreva)

```
programa echo
inteiro x

inicio
  leia x
  escreva x
fim
```

**Interação esperada:**
```
$ ./programa
5        ← input
5        ← output (escreva)
```

### Exemplo 2: Soma de N números

```
programa soma
inteiro n, i, acc, x

inicio
  leia n
  acc <- 0
  i <- 1
  
  enquanto i <= n faca
    leia x
    acc <- acc + x
    i <- i + 1
  fimenquanto
  
  escreva acc
fim
```

**Interação esperada:**
```
$ ./programa
3        ← N
10       ← x1
20       ← x2
30       ← x3
60       ← acc (10+20+30)
```

### Exemplo 3: Contagem com timeout

```
programa timeout_test
inteiro i

inicio
  i <- 0
  enquanto i < 1000000 faca
    escreva i
    i <- i + 1
  fimenquanto
fim
```

**Esperado:** após 10s, execução interrompida automaticamente (timeout)

---

## 🔧 Checklist para iniciar desenvolvimento

### Pré-requisitos (verificar)

- [ ] Docker + Docker Compose funcionando (`docker compose ps` mostra todos os serviços)
- [ ] `simplesc` compilador disponível no backend (`curl http://localhost/api/health` mostra `"simplesc": "ok"`)
- [ ] NASM + i686-linux-gnu-ld rodando (`curl http://localhost/api/health`)
- [ ] Imagem `simples-runner:latest` construída (`docker images | grep simples-runner`)
- [ ] Sprint 2 completa e funcional (POST /api/compile retorna .asm)

### Desenvolvimento

- [ ] Criar `backend/app/routes/execution.py` (rota /ws/run)
- [ ] Criar `backend/app/strategies/execution.py` (PtyExecutionStrategy)
- [ ] TDD: testes em `backend/tests/test_execution_strategy.py` (falham)
- [ ] Implementar PtyExecutionStrategy (testes passam)
- [ ] Testar localmente com `wscat` ou `websocat`
- [ ] Criar `frontend/src/components/Terminal.tsx`
- [ ] Criar `frontend/src/hooks/useExecution.ts`
- [ ] Modificar `frontend/src/routes/index.tsx` para 3 painéis
- [ ] Testes manuais com exemplos acima

---

## 🎓 User Stories Sprint 3

- **US-04** (✅ existe) — Como aluno, quero executar o binário e ver a saída no terminal
- **US-05** (✅ existe) — Como aluno, quero digitar input via `leia` no terminal
- **US-07** (✅ existe) — Como aluno, quero interromper a execução (botão Stop)
- **US-09** (✅ existe) — Como aluno, loops infinitos não travam o serviço (timeout automático)

---

## 📝 Recursos e referências

### Documentação técnica

- **xterm.js:** https://xtermjs.org/ — terminal emulador em JavaScript
- **Node pty-spawn:** https://github.com/Microsoft/node-pty — PTY management
- **Docker exec + stdin/stdout:** Docker API for container I/O
- **WebSocket em Flask:** `python-socketio` ou `python-websockets` (verificar stack)
- **Supabase JWT:** https://supabase.com/docs/guides/auth

### Exemplos Sprint 2 (padrões de qualidade)

- Padrão TDD: `backend/tests/test_compiler_service.py` (6 testes + 4 novos de validação)
- Padrão de rota + logging: `backend/app/routes/compile.py` com `structlog`
- Padrão de component React: `frontend/src/components/SimplesEditor.tsx` + `NasmPanel.tsx`
- Padrão de hook: `frontend/src/lib/auth.ts` (useAuth)

---

## ⚠️ Considerações importantes

### Segurança

- Container **deve** rodar com `--network=none` (sem rede)
- Container **deve** rodar com `--read-only` (sistema de arquivos readonly)
- Container **deve** usar cgroups para limitar CPU/memória
- Usuário dentro do container: `nobody:nobody` (UID 65534)
- Validar JWT em **toda** conexão WebSocket

### Performance

- PTY round-trip ≤ 200ms (p95) em rede regional
- Timeout padrão: 10s para execução, 15s para compilação
- WebSocket keep-alive: idle pings a cada 30s (evita proxy drop)

### Escalabilidade

- Backend stateless: cada conexão WebSocket usa uma worker thread/process
- Estado (PTY, container ID) em memória do worker
- Sticky session via Nginx (IP hash) para manter PTY na mesma worker

---

## 📞 Dúvidas frequentes esperadas

**P: Qual WebSocket library usar?**  
R: Verificar `backend/requirements.txt`. Se estiver `python-socketio`, use `@socketio.on()`. Se for `websockets`, implemente rota ASGI. Sprint 2 usou apenas REST/Flask, então provavelmente vamos adicionar socketio nesta sprint.

**P: Como gerenciar múltiplas conexões simultâneas?**  
R: Backend stateless. Cada worker Python tem sua própria worker thread/process. Nginx faz sticky session por IP hash.

**P: O que fazer se o container não sair após SIGKILL?**  
R: Docker vai forçar (`OOMKilled` state). Log + fechar WebSocket. Monitorar com health check do Docker.

**P: Como testar localmente sem Docker?**  
R: Use `subprocess.Popen()` diretamente (sem container) para TDD. Depois adaptar para Docker.

---

## 🚀 Próximas sprints (referência)

- **Sprint 4:** Segurança + rate limiting + validação
- **Sprint 5:** Observabilidade + deploy OCI ARM64
- **Sprint 6:** Testes E2E + documentação

---

**Autor:** Sessão de desenvolvimento Sprint 2  
**Última atualização:** 2026-06-15  
**Status:** Pronto para brainstorming + spec design com superpowers:brainstorming
