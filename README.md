# Simples-editor

[![CI](https://github.com/IncludeLuisFerreira/Simples-editor/actions/workflows/ci.yml/badge.svg)](https://github.com/IncludeLuisFerreira/Simples-editor/actions/workflows/ci.yml)

Online IDE for the SIMPLES programming language. Write, compile, and execute SIMPLES programs directly from the browser.

## Stack

- **Frontend**: React 18, TypeScript, TanStack Router, Tailwind CSS, Vite
- **Backend**: Flask 3.0 (Python 3.11), WebSockets, Supabase Auth
- **Infrastructure**: Docker Compose, Nginx reverse proxy, GitHub Actions CI

## Architecture

```
Client ──► Nginx (80/443)
              ├── / ──► Frontend (React static)
              ├── /api/ ──► Backend (Flask REST)
              └── /ws/ ──► Backend (WebSocket)

Backend ──► Docker SDK ──► Runner Container (sandbox)
                                    │
                                    ▼
                            qemu-i386 (ARM64) / native (x86_64)
```

The backend spawns ephemeral Docker containers (`simples-runner`) for isolated code execution. Each container compiles SIMPLES source with `simplesc`, assembles with NASM, links with `i686-linux-gnu-ld`, and executes under `qemu-i386-static` on ARM64 hosts.

## Prerequisites

- Docker 24+
- Docker Compose v2
- gh CLI (for development workflow)

## Local Setup

```bash
# 1. Clone the repository
git clone https://github.com/IncludeLuisFerreira/Simples-editor.git
cd Simples-editor

# 2. Configure environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Start all services
docker compose up --build -d

# 4. Verify everything is running
docker compose ps
curl http://localhost/api/health
```

The application will be available at `http://localhost`.

### Useful commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Stop and remove volumes
docker compose down -v
```

## Linting

```bash
make lint            # Run all linters
make lint-backend    # Backend only (ruff)
make lint-frontend   # Frontend only (ESLint)
```

## Project Structure

```
├── backend/          # Flask API (REST + WebSocket)
├── frontend/         # React SPA
├── nginx/            # Reverse proxy config + SSL
├── runner/           # Sandbox execution container
├── scripts/          # Utility scripts
├── docs/             # Documentation
└── docker-compose.yml
```

## License

MIT — see [LICENSE](LICENSE).