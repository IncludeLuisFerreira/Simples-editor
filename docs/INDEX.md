# Simples Editor — Documentation Index

> Navigação centralizada para todos os docs do projeto. Use este índice para orientação rápida.

---

## 🚀 Começar aqui

| Papel | Arquivo | Tempo | Propósito |
|-------|---------|-------|----------|
| **Novo desenvolvedor (qualquer sprint)** | [`SPRINT3-README.md`](SPRINT3-README.md) | 10 min | Instruções pra começar + checklist |
| **Deepseek antes de Sprint 3** | [`sprint-3-execution-prd.md`](sprint-3-execution-prd.md) | 30 min | Escopo completo, arquitetura, exemplos |
| **Entender projeto inteiro** | [`../prd-simples-online.md`](../prd-simples-online.md) | 60 min | Vision, requisitos, stack técnica |
| **Status atual** | [`../PROGRESS.md`](../PROGRESS.md) | 5 min | Quais issues estão prontas |

---

## 📁 Documentação por tema

### Desenvolvimento Sprint 3 (próxima)

```
docs/
├── SPRINT3-README.md          ← LEIA PRIMEIRO (10 min)
├── sprint-3-execution-prd.md  ← PRD detalhado (30 min)
├── GIT_WORKFLOW.md            ← Padrão de commits
└── superpowers/
    ├── specs/2026-06-12-sprint2-editor-compiler-design.md  (referência)
    └── plans/2026-06-12-sprint2-editor-compiler.md         (referência)
```

**Workflow:**
1. Leia `SPRINT3-README.md` (checklist de pré-requisitos)
2. Confirme que `docker compose ps` mostra todos os serviços
3. Invoque `/superpowers:brainstorming` para começar o design
4. Escreva spec com `/superpowers:writing-plans`
5. Execute com `/superpowers:subagent-driven-development`

### Desenvolvimento Sprint 2 (completed ✅)

```
docs/superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md
└─ Arquitetura: compilação simplesc→nasm→ld, contrato de dados, fases

docs/superpowers/plans/2026-06-12-sprint2-editor-compiler.md
└─ Plano detalhado: 7 tasks, TDD, commits
   ├─ Task 1: CompilerService (backend)
   ├─ Task 2: Route /api/compile (backend)
   ├─ Task 3: Tokenizer // (frontend)
   ├─ Task 4: CompileMarker props (frontend)
   ├─ Task 5: NasmPanel component (frontend)
   └─ Task 6: index.tsx state machine (frontend)
```

**Para entender padrão de qualidade:** leia essas duas.

### Setup e infra

```
docs/
├── DOCKER_SETUP.md     ← Como rodar localmente (docker compose up)
├── GIT_WORKFLOW.md     ← Commits, branches, PRs
└── ../CONTRIBUTING.md  ← Convenções do projeto
```

---

## 🔍 Quick Reference

### Onde encontrar...

| Pergunta | Resposta |
|----------|---------|
| "Como faço git checkout de um branch?" | [`docs/GIT_WORKFLOW.md`](GIT_WORKFLOW.md) |
| "Qual é o padrão de commit?" | [`../CONTRIBUTING.md`](../CONTRIBUTING.md) |
| "Como subo a aplicação?" | [`docs/DOCKER_SETUP.md`](DOCKER_SETUP.md) |
| "Qual é o escopo de Sprint 2?" | [`docs/superpowers/plans/2026-06-12-sprint2-editor-compiler.md`](superpowers/plans/2026-06-12-sprint2-editor-compiler.md) |
| "Qual é a arquitetura de compilação?" | [`docs/superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md`](superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md) |
| "Quais issues estão prontas?" | [`../PROGRESS.md`](../PROGRESS.md) |
| "Preciso começar Sprint 3 — por onde começo?" | 👇 Seção abaixo |

---

## 🎯 Para começar Sprint 3

### 1️⃣ Leia (1 hora)

```bash
# Terminal
cat docs/SPRINT3-README.md                        # 10 min — checklist
cat docs/sprint-3-execution-prd.md                # 30 min — escopo
cat ../prd-simples-online.md | head -200          # 20 min — seções 1-7
```

### 2️⃣ Verifique (10 min)

```bash
docker compose ps                        # tudo rodando?
curl http://localhost/api/health         # backend alive?
npm run build -C frontend                # frontend compila?
python -m pytest -C backend -v           # testes passam?
```

### 3️⃣ Brainstorm (20 min)

No seu chat:
```
/superpowers:brainstorming Sprint 3 — Execução em Sandbox com WebSocket + Terminal
```

Responda as 5 perguntas que vai fazer sobre:
- WebSocket library
- Terminal UI
- Sandbox strategy
- Timeout architecture
- State management

### 4️⃣ Escreva Spec (30 min)

Depois que brainstorming terminar:
```
/superpowers:writing-plans Sprint 3 implementação
```

Isso cria `docs/superpowers/specs/2026-06-15-sprint3-execution-design.md`

### 5️⃣ Execute (4-6 horas)

```
/superpowers:subagent-driven-development
```

Executa o plano com TDD, spec reviews, quality reviews.

---

## 📊 Estrutura de documentos superpowers

Cada sprint tem 2 arquivos:

```
docs/superpowers/specs/YYYY-MM-DD-<tema>-design.md
├─ Contexto
├─ Decisões arquiteturais
├─ Data contracts
├─ Fluxo end-to-end
└─ Exemplos

docs/superpowers/plans/YYYY-MM-DD-<tema>.md
├─ Goal
├─ Architecture (1-3 frases)
├─ Task 1: ...
│  ├─ Files
│  ├─ Step 1: Write test
│  ├─ Step 2: Run test (fail)
│  ├─ Step 3: Implement
│  ├─ Step 4: Run test (pass)
│  └─ Step 5: Commit
├─ Task 2: ...
└─ ...
```

**Padrão:** TDD, 7 tasks, bite-sized (5 min cada), commits frequentes.

---

## 📚 Referência — Todos os docs

### Root (projeto)

- `prd-simples-online.md` — Visão, requisitos, stack, arquitetura (PRD principal)
- `PROGRESS.md` — Status de todas as 6 sprints
- `README.md` — Overview técnico
- `CONTRIBUTING.md` — Convenções
- `Makefile` — Targets de lint/format
- `docker-compose.yml` — Serviços (frontend, backend, nginx, runner)
- `docker-compose.override.yml` — Overrides dev (HTTP simples)

### docs/

- `INDEX.md` — Este arquivo
- `SPRINT3-README.md` — Instruções pra Sprint 3 (novo)
- `sprint-3-execution-prd.md` — PRD Sprint 3 (novo)
- `DOCKER_SETUP.md` — Como subir local
- `GIT_WORKFLOW.md` — Git + branches + PRs
- `SPRINTS.md` — Timeline de sprints
- `ISSUES_PLAN.md` — Roadmap de issues
- `superpowers/specs/` — Specs completadas (refs de padrão)
- `superpowers/plans/` — Planos completados (refs de padrão)

### Backend

- `backend/requirements.txt` — Dependências Python
- `backend/app/services/compiler.py` — CompilerService (ref para style)
- `backend/app/routes/compile.py` — Rota POST /api/compile (ref)
- `backend/tests/test_compiler_service.py` — Testes TDD (ref)

### Frontend

- `frontend/package.json` — Dependências Node
- `frontend/src/components/SimplesEditor.tsx` — Editor (ref)
- `frontend/src/components/NasmPanel.tsx` — Painel NASM (ref)
- `frontend/src/routes/index.tsx` — Layout (ref, será modificado Sprint 3)
- `frontend/src/lib/auth.ts` — Auth hook (ref)

---

## 💡 Dicas de navegação

### Encontrar padrão de código

```
Quer saber como estruturar...?
├─ Service Python (CompilerService) → backend/app/services/compiler.py
├─ Rota Flask + logging → backend/app/routes/compile.py
├─ Testes pytest + mocks → backend/tests/test_compiler_service.py
├─ Componente React → frontend/src/components/SimplesEditor.tsx
├─ Hook React → frontend/src/lib/auth.ts
└─ State machine → frontend/src/routes/index.tsx
```

### Entender arquitetura

```
Quer entender...?
├─ Como compilação funciona → superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md
├─ Como código-fonte → tokenizer → highlights → sprint-3-execution-prd.md (seção arquitetura)
├─ Como request HTTP flui → superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md (seção fluxo)
└─ Como errros são tratados → superpowers/specs/2026-06-12-sprint2-editor-compiler-design.md (seção phase discriminator)
```

### Verificar status

```
Status atual...?
├─ Sprint overall → PROGRESS.md
├─ Issues pendentes → PROGRESS.md (Sprint X seção)
├─ Git branches → git branch -a
├─ Containers rodando → docker compose ps
└─ Testes passando → pytest -v (backend) / npm run build (frontend)
```

---

## 🔄 Workflow típico

```
1. Lê este INDEX.md
   ↓
2. Clica em SPRINT3-README.md se for Sprint 3
   ↓
3. Faz checklist de pré-requisitos
   ↓
4. Invoca /superpowers:brainstorming no chat
   ↓
5. Escreve spec com /superpowers:writing-plans
   ↓
6. Implementa com /superpowers:subagent-driven-development
   ↓
7. Cria PR pro dev com closes #X #Y #Z
   ↓
8. Aprova, merge, celebra 🎉
```

---

## ⚡ Links rápidos

- **Para agora:** [`SPRINT3-README.md`](SPRINT3-README.md)
- **Entender arquitetura:** [`../prd-simples-online.md`](../prd-simples-online.md)
- **Ver status:** [`../PROGRESS.md`](../PROGRESS.md)
- **Setup local:** [`DOCKER_SETUP.md`](DOCKER_SETUP.md)
- **Git workflow:** [`GIT_WORKFLOW.md`](GIT_WORKFLOW.md)

---

**Última atualização:** 2026-06-15  
**Manutenido por:** Sessão Sprint 2/3
