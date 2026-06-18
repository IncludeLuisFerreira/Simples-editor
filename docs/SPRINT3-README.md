# Sprint 3 — Leitura obrigatória para Deepseek/Novo desenvolvedor

## 🎯 Comece por aqui (15 min)

1. **[`docs/sprint-3-execution-prd.md`](sprint-3-execution-prd.md)** — você está aqui
2. **[`prd-simples-online.md`](../prd-simples-online.md)** — leia **seções 1-7 e 9-11** (user stories, arquitetura, segurança)
3. **[`PROGRESS.md`](../PROGRESS.md)** — veja o status de Sprint 1 ✅ e Sprint 2 ✅

## 📖 Leitura de contexto (30 min)

### Design + Plano Sprint 2 (já fechada)

Leia estes para entender o **padrão de qualidade esperado**:

- **[`docs/superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md`](../docs/superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md)** — como estruturar specs
  - Leia: contrato de dados, fases de erro, discriminadores de UX
  - Aprenda: padrão de spec = arquitetura + data contracts + diagrama UX

- **[`docs/superpowers/plans/2026-06-12-sprint2-editor-compiler.md`](../docs/superpowers/plans/2026-06-12-sprint2-editor-compiler.md)** — como estruturar planos
  - Leia: formato de tasks (7 tasks, TDD, commits frequentes)
  - Aprenda: padrão de plano = bite-sized tasks, 2-5 min cada, com código exato

### Desenvolvimento (aplicar a Sprint 3)

Use esses **padrões de código** como referência:

#### Backend (Python/Flask + pytest)

1. **`backend/app/services/compiler.py`** (linha 1-30)
   - Leia: structure do `CompilerService`
   - **Padrão:** criar `PtyExecutionStrategy` seguindo este style

2. **`backend/app/routes/compile.py`**
   - Leia: structure de rota + validação + erro handling + logging
   - **Padrão:** rota `/ws/run` seguirá este style (mas assíncrona com WebSocket)

3. **`backend/tests/test_compiler_service.py`**
   - Leia: formato de TDD (mocks, assertions, call_count)
   - **Padrão:** testes de `PtyExecutionStrategy` seguirão este style

4. **`backend/tests/test_compile_route.py`**
   - Leia: testes de rota com `patch` + `self.client.post`
   - **Padrão:** será adaptado para WebSocket (wscat / websockets)

#### Frontend (React/TypeScript + Monaco)

1. **`frontend/src/components/SimplesEditor.tsx`**
   - Leia: structure de componente + useRef + useEffect + onMount handler
   - **Padrão:** `Terminal.tsx` seguirá este style

2. **`frontend/src/components/NasmPanel.tsx`**
   - Leia: componente controlado com 4 estados (idle/compiling/success/error)
   - **Padrão:** aplicável a outros componentes

3. **`frontend/src/routes/index.tsx`**
   - Leia: state machine de compilação (nasmState, markers, infraError)
   - **Modificar:** adicionar Terminal component + estado de execução

4. **`frontend/src/lib/auth.ts`**
   - Leia: hook `useAuth()` + `session.access_token`
   - **Usar:** em WebSocket handshake de `/ws/run`

## 🔬 Investigação técnica (20 min)

Antes de brainstorm, confirme estes pontos:

### 1. WebSocket Library no backend

```bash
cat backend/requirements.txt | grep -i socket
# Esperado: python-socketio OU websockets OU aiohttp
```

Se não tiver, vamos adicionar na Sprint 3.

### 2. xterm.js instalado no frontend

```bash
cat frontend/package.json | grep xterm
# Esperado: "xterm": "^5.x.x"
```

Se não tiver, precisa instalar.

### 3. Container runner disponível

```bash
docker images | grep simples-runner
# Esperado: simples-runner:latest
```

Se não mostrar, o `docker compose build` cria.

### 4. Backend consegue fazer docker.exec()

```bash
# No backend, Python consegue fazer:
import docker
client = docker.from_env()
container = client.containers.run("simples-runner:latest", ...)
```

Verificar se `docker-py` está em requirements.txt.

## ✍️ Próximo passo: Brainstorming

Quando terminar de ler, invoque no seu chat:

```
/superpowers:brainstorming Sprint 3 — WebSocket + Terminal + Execução em Sandbox
```

**O que o brainstorming vai perguntar:**

1. **Tipo de WebSocket library?** (socketio vs websockets vs custom)
2. **Terminal UI preference?** (xterm.js vs ansi.js vs custom rendering)
3. **Sandbox strategy?** (docker run --rm vs persistent containers)
4. **Timeout + cleanup strategy?** (3-layer timeout: wall-clock, process, container)
5. **State management** WebSocket? (Redux vs Context vs local hook)

---

## 📋 Checklist — Antes de chamar o brainstorming

- [ ] Li o `sprint-3-execution-prd.md` inteiro
- [ ] Li seções 1-7 e 9-11 do `prd-simples-online.md`
- [ ] Verifiquei PROGRESS.md (Sprint 2 = 6/6 ✅)
- [ ] Entrendi o padrão de spec (2026-06-12-sprint2-editor-compiler-design.md)
- [ ] Entendi o padrão de plano (2026-06-12-sprint2-editor-compiler.md)
- [ ] Rodei `docker compose ps` e confirmei tudo subindo
- [ ] Rodei `curl http://localhost/api/health` e viu "ok"
- [ ] Rodei `npm run build` no frontend sem erros TypeScript
- [ ] Rodei `python -m pytest -v` no backend: 23 tests PASSED

---

## 🔗 Arquivos-chave por tema

### WebSocket + PTY

```
backend/app/routes/execution.py         ← CRIAR (rota /ws/run)
backend/app/strategies/execution.py     ← CRIAR (PtyExecutionStrategy)
backend/tests/test_execution_strategy.py ← CRIAR (TDD)
frontend/src/hooks/useExecution.ts      ← CRIAR (estado WebSocket)
```

### Terminal UI

```
frontend/src/components/Terminal.tsx    ← CRIAR (xterm.js)
frontend/src/routes/index.tsx           ← MODIFICAR (adicionar terminal)
```

### Configuração

```
backend/requirements.txt                ← ADICIONAR (socketio/websockets)
frontend/package.json                   ← VERIFICAR (xterm.js)
docker-compose.yml                      ← VERIFY (backend expõe :5000)
nginx/nginx.dev.conf                    ← VERIFY (/ws/ roteia pro backend)
```

---

## 📞 FAQ rápido

**P: Quanto tempo vai levar ler tudo isso?**  
R: 1-1.5 horas. Sprint-3-prd (15 min) + Sprint 2 design/plan (30 min) + investigação (20 min) + brainstorming (20 min).

**P: Preciso entender TODA a linguagem SIMPLES?**  
R: Não. Basta saber: `leia` (input), `escreva` (output), variáveis. Pode ignorar `para`, `enquanto`, construtos complexos — não importam para execução.

**P: E se quebrar algo durante Sprint 3?**  
R: Cada feature branch é isolada (git worktree). Se errar, volta pra `dev` limpo. Sprint 2 tá ✅ commitada.

**P: Como vou saber se está pronto pra merge?**  
R: Quando tiver: todos os testes passando (23 + novos), build TypeScript limpo, manual testing dos 3 exemplos funcionando.

---

## 🚀 Começar agora

1. Leia este arquivo até o fim
2. Verifique os pré-requisitos (checklist acima)
3. Abra seu editor
4. Invoque: `/superpowers:brainstorming Sprint 3 — Execução em Sandbox com WebSocket + Terminal`

**Sucesso! 🎉**
