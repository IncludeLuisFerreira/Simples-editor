<div align="center">

# 🧩 Simples-editor

**IDE online para a linguagem de programação SIMPLES**

[![CI](https://img.shields.io/github/actions/workflow/status/IncludeLuisFerreira/Simples-editor/ci.yml?branch=main&logo=githubactions&logoColor=white&label=CI)](https://github.com/IncludeLuisFerreira/Simples-editor/actions/workflows/ci.yml)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.0-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-2496ED?logo=docker&logoColor=white)](https://docker.com)
[![Licença](https://img.shields.io/badge/Licença-MIT-yellow)](LICENSE)

</div>

---

## Visão Geral

**Simples-editor** é um ambiente integrado de desenvolvimento *online* para a linguagem **SIMPLES** — uma linguagem de programação educacional com palavras-chave em português, criada para o ensino de lógica de programação.

O fluxo do editor até a execução é totalmente remoto: o código escrito no navegador é enviado para uma API Flask, compilado para assembly x86 (via `simplesc`), montado com **NASM**, linkeditado com `i686-linux-gnu-ld` e executado em contêineres Docker efêmeros com isolamento completo. A saída é transmitida em tempo real via **WebSocket** para um terminal **xterm.js** no navegador.

### Funcionalidades

- ✏️ Editor Monaco com syntax highlighting para SIMPLES e assembly x86
- 🚀 Compilação e execução remota com sandbox isolado via Docker
- ⚡ Transmissão de saída em tempo real via WebSocket
- 🔐 Autenticação via Supabase Auth
- 📊 Monitoramento com Prometheus + Grafana
- 🐳 Infraestrutura 100% conteinerizada com Docker Compose
- ☁️ Deploy em Oracle Cloud (ARM64 Ampere A1) via Terraform

---

## QuickStart

### Pré-requisitos

- Docker 24+
- Docker Compose v2

### Setup local

```bash
# Clone o repositório
git clone https://github.com/IncludeLuisFerreira/Simples-editor.git
cd Simples-editor

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais do Supabase

# Inicie todos os serviços
docker compose up --build -d

# Verifique o status
docker compose ps
curl http://localhost/api/health
```

A aplicação estará disponível em `http://localhost`.

### Comandos úteis

```bash
docker compose logs -f        # Acompanhar logs
docker compose down           # Parar serviços
docker compose down -v        # Parar e remover volumes
make lint                     # Executar todos os linters
make lint-backend             # Lint no backend (ruff)
make lint-frontend            # Lint no frontend (ESLint)
```

---

## Arquitetura

```
┌──────────┐      ┌──────────┐      ┌──────────────┐
│  Client  │ ──►  │  Nginx   │ ──►  │  Frontend    │
│ (Browser)│ ◄──  │ (Proxy)  │      │ (React SPA)  │
└──────────┘      └────┬─────┘      └──────────────┘
                       │
               ┌───────┴────────┐
               │                │
        ┌──────▼──────┐  ┌─────▼──────┐
        │  /api/*     │  │  /ws/*     │
        │ (REST)      │  │(WebSocket) │
        └──────┬──────┘  └─────┬──────┘
               │                │
        ┌──────▼────────────────▼──────┐
        │         Backend (Flask)       │
        │  • CompilerService            │
        │  • PtyExecutionStrategy       │
        │  • Auth (Supabase JWT)        │
        │  • Rate Limiting              │
        │  • Prometheus Metrics         │
        └──────────────┬───────────────┘
                       │
              ┌────────▼────────┐
              │  Docker SDK     │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │  Runner Cont.   │
              │  (sandbox)      │
              │                 │
              │  ┌───────────┐  │
              │  │  simplesc │  │
              │  │  ─► nasm  │  │
              │  │  ─► ld    │  │
              │  │  ─► exec  │  │
              │  └───────────┘  │
              └─────────────────┘
```

### Componentes

| Camada | Tecnologia | Função |
|--------|-----------|--------|
| **Frontend** | React 18 + TypeScript + Vite | Interface do editor com Monaco, terminal xterm.js e painéis redimensionáveis |
| **Proxy** | Nginx | Roteamento para API REST, WebSocket e assets estáticos |
| **Backend** | Flask 3.0 + gevent + WebSocket | Compilação, sandbox, autenticação e métricas |
| **Runner** | Docker (Debian slim + qemu-user-static) | Contêiner efêmero para compilação e execução isolada |
| **Auth** | Supabase | Autenticação por e-mail/senha e JWT |
| **Monitoria** | Prometheus + Grafana | Métricas de uso e alertas |
| **Infra** | Terraform + Oracle Cloud (Ampere A1 ARM64) | Provisionamento e deploy |

### Estrutura do projeto

```
├── backend/            # API Flask (REST + WebSocket)
│   ├── app/
│   │   ├── middleware/ # Auth, logging, rate limiting
│   │   ├── routes/     # Health, auth, compile, execution, metrics
│   │   ├── services/   # CompilerService, validation, metrics
│   │   └── strategies/ # PtyExecutionStrategy (sandbox)
│   └── tests/          # Testes com pytest
├── frontend/           # SPA React + TypeScript
│   ├── src/
│   │   ├── components/ # Editor, Terminal, AuthGuard, etc.
│   │   ├── hooks/      # useExecution, useSplitter
│   │   ├── lib/        # Supabase client, Monaco lang definitions
│   │   └── routes/     # TanStack Router pages
│   └── examples/       # Programas exemplos em SIMPLES
├── runner/             # Imagem do sandbox de execução
├── nginx/              # Configuração do proxy reverso
├── monitoring/         # Prometheus + Grafana (provisionado)
├── terraform/          # IaC para Oracle Cloud (Ampere A1)
├── scripts/            # Deploy, SSL, validação
└── docs/               # Documentação
```

---

## Exemplos

> *Imagens serão adicionadas em breve.*

| Tela | Descrição |
|------|-----------|
| Editor | Interface principal com editor Monaco, painel de saída NASM e terminal |
| Login | Tela de autenticação via Supabase Auth UI |
| Terminal | Execução de programa SIMPLES com saída em tempo real |

---

## Licença

Distribuído sob licença MIT. Veja [LICENSE](LICENSE) para mais informações.
