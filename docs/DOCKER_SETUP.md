# Simples Editor - Docker Compose Setup

## Desenvolvimento Local

### Pré-requisitos
- Docker 24+
- Docker Compose v2

### Setup

1. Copiar variáveis de ambiente:
```bash
cp .env.example .env
# Editar .env com suas credenciais Supabase
```

2. Subir todos os serviços:
```bash
docker compose up --build -d
```

3. Verificar:
```bash
docker compose ps
curl http://localhost/api/health
```

4. Ver logs:
```bash
docker compose logs -f
```

### Estrutura

- **frontend**: Interface React (porta 80 interna)
- **backend**: Flask + simplesc + nasm + ld (porta 5000 interna)
- **nginx_app**: Reverse proxy (portas 80/443 públicas)
- **runner_image_build**: Imagem sandbox para execução

### Parar

```bash
docker compose down
```

### Limpar volumes

```bash
docker compose down -v
```

## Arquitetura

```
Cliente → Nginx (80/443)
            ├── / → Frontend (estático)
            ├── /api/ → Backend (Flask)
            └── /ws/ → Backend (WebSocket)

Backend spawna containers descartáveis (simples-runner:latest) para execução isolada.
```

## Notas

- Volume `/var/run/docker.sock` permite backend spawnar containers
- Suporte multi-arch (x86_64 e ARM64 via qemu-user-static)
- Sandbox usa usuario nobody (65534), network=none, read-only
