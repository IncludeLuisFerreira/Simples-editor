# Deploy em Produção — Simples Editor

> Guia passo-a-passo para deploy do Simples Editor em Oracle Cloud Infrastructure (OCI) Ampere A1.

---

## Pré-requisitos

### Contas e Serviços

| Item | Descrição | Custo |
|------|-----------|-------|
| [Oracle Cloud](https://cloud.oracle.com) | Conta free tier (sempre-free eligível) | Grátis |
| [Supabase](https://supabase.com) | Projeto para autenticação e banco | Grátis (free tier) |
| Domínio DNS | Domínio apontado para o IP da VM | Variável |
| [GitHub](https://github.com) | Repositório do projeto | Grátis |

### Ferramentas Locais

```bash
# Essenciais
terraform >= 1.5     # Provisionamento OCI
gh >= 2.0            # GitHub CLI (opcional)
docker               # Para testes locais

# CLI da Oracle
curl -LO https://raw.githubusercontent.com/oracle/oci-cli/master/scripts/install/install.sh
bash install.sh
oci setup config      # Configurar chaves de API
```

---

## 1. Provisionamento via Terraform

### 1.1 Configurar variáveis

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars
```

Preencher com seus valores:

```hcl
compartment_ocid = "ocid1.compartment.oc1..aaaaaa..."
ssh_public_key   = "ssh-rsa AAAAB3NzaC1yc2E..."
tenancy_ocid     = "ocid1.tenancy.oc1..aaaaaa..."
user_ocid        = "ocid1.user.oc1..aaaaaa..."
fingerprint      = "12:34:56:78:90:ab:cd:ef:..."
private_key_path = "~/.oci/oci_api_key.pem"
region           = "us-ashburn-1"
```

### 1.2 Provisionar infraestrutura

```bash
terraform init
terraform plan
terraform apply -auto-approve
```

Ao final, o output exibirá o IP público:

```
Outputs:
public_ip = "129.xxx.xxx.xxx"
```

### 1.3 Configurar DNS

Criar um registro A no seu provedor DNS apontando o domínio para o IP público:

```
simples.exemplo.edu.br.  A  129.xxx.xxx.xxx
```

---

## 2. Bootstrap do Host

### 2.1 Acessar a VM

```bash
ssh -i ~/.ssh/sua_chave ubuntu@129.xxx.xxx.xxx
```

### 2.2 Verificar cloud-init

O provisionamento via Terraform já executa o `cloud-init.yaml`, que instala:

- Docker Engine + Docker Compose
- UFW (firewall)
- qemu-user-static (suporte ARM64)
- gh CLI
- Cron de limpeza diária de containers

Verificar se tudo está OK:

```bash
sudo cloud-init status --wait
docker --version
docker compose version
sudo ufw status
```

### 2.3 Verificar firewall (manual)

Caso precise reconfigurar:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
```

> **⚠ Importante**: Após habilitar o UFW, o SSH continua funcionando APENAS se a regra `allow 22/tcp` foi adicionada ANTES de ativar.

---

## 3. Deploy da Aplicação

### 3.1 Configurar ambiente

```bash
cd /opt/simples-editor
cp .env.example .env
nano .env
```

Preencher as variáveis obrigatórias:

```bash
SECRET_KEY=<gerar: python3 -c "import secrets; print(secrets.token_hex(32))">
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=<sua-chave-anon>
JWT_SECRET=<seu-jwt-secret>
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=<sua-chave-anon>
```

### 3.2 Executar deploy

```bash
# Opção 1: Script automatizado
export DOMAIN=simples.exemplo.edu.br
bash scripts/deploy.sh

# Opção 2: Manual
docker compose build --parallel
docker compose up -d
```

### 3.3 Verificar serviços

```bash
docker compose ps
# frontend    Up
# backend     Up
# nginx_app   Up
```

---

## 4. Configuração TLS (Let's Encrypt)

### 4.1 Obter certificado

```bash
export DOMAIN=simples.exemplo.edu.br
bash scripts/setup-ssl.sh "$DOMAIN"
```

O script:

1. Instala certbot (se necessário)
2. Obtém certificado via validação HTTP (porta 80)
3. Copia `fullchain.pem` e `privkey.pem` para `nginx/ssl/`
4. Configura cron para renovação automática (3:00 AM)

### 4.2 Verificar certificado

```bash
sudo certbot certificates
openssl x509 -in nginx/ssl/fullchain.pem -noout -dates
```

### 4.3 Renovação manual

```bash
sudo certbot renew
bash scripts/setup-ssl.sh "$DOMAIN"
```

---

## 5. Verificação

### 5.1 Health check

```bash
# Interno (backend direto)
curl http://localhost:5000/api/health

# Externo (via nginx)
curl -I https://simples.exemplo.edu.br/api/health
```

Resposta esperada:

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "components": {
    "compiler": {"status": "ok", "version": "simplesc 1.0"},
    "nasm": {"status": "ok", "version": "NASM version 2.x"},
    "docker": {"status": "ok"},
    "supabase": {"status": "ok", "config": "configured"}
  }
}
```

### 5.2 Smoke tests

```bash
# 1. Frontend carrega
curl -s https://simples.exemplo.edu.br | grep -q "Simples Editor"

# 2. API responde
curl -s https://simples.exemplo.edu.br/api/health | grep -q "healthy"

# 3. Compilação funciona
curl -s -X POST https://simples.exemplo.edu.br/api/compile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "programa teste\ninicio\nescreva \"ola\"\nfim\n"}'
```

### 5.3 WebSocket (via wscat)

```bash
npm install -g wscat
wscat -c "wss://simples.exemplo.edu.br/ws/run?token=<jwt>"
```

### 5.4 Métricas

```bash
curl -s http://localhost:5000/metrics | grep -E "simples_*"
```

O endpoint `/metrics` é bloqueado externamente pelo nginx.

---

## 6. Troubleshooting

### Container não sobe

```bash
docker compose logs backend
docker compose logs nginx_app
```

### Compilação falha

```bash
# Verificar se simplesc está disponível no backend
docker compose exec backend simplesc --version

# Verificar nasm
docker compose exec backend nasm -v

# Verificar ld
docker compose exec backend i686-linux-gnu-ld --version
```

### SSL não funciona

```bash
# Verificar se certificados existem
ls -la nginx/ssl/

# Verificar validade
openssl x509 -in nginx/ssl/fullchain.pem -noout -text | head -20

# Verificar log do nginx
docker compose logs nginx_app

# Re-emitir certificado
sudo certbot certonly --standalone -d simples.exemplo.edu.br
```

### Timeout de execução

Se programas SIMPLES estão estourando timeout em ARM64:

```bash
# Aumentar timeout para execução (default: 15s ARM64, 10s x86_64)
echo "EXEC_TIMEOUT_S_ARM64=20" >> .env
docker compose up -d backend
```

### Rate limit atingido

O limite default é 30 execuções/minuto por usuário. Para ajustar:

```bash
echo "RUNS_PER_MINUTE=60" >> .env
docker compose up -d backend
```

### Docker cleanup manual

```bash
# Limpar containers parados
docker container prune -f

# Limpar imagens não utilizadas
docker image prune -f

# Limpar tudo (cuidado!)
docker system prune -f
```

---

## 7. Checklist de Validação Pós-Deploy

- [ ] `terraform apply` concluído sem erros
- [ ] IP público acessível via ping
- [ ] SSH funciona (porta 22)
- [ ] HTTP redireciona para HTTPS (porta 80 → 443)
- [ ] HTTPS funcionando com certificado válido
- [ ] Frontend carrega no navegador
- [ ] Login via Supabase funciona
- [ ] Compilação de código SIMPLES retorna NASM
- [ ] Execução com output no terminal funciona
- [ ] Health check retorna `healthy`
- [ ] WebSocket conecta e transmite dados
- [ ] `/metrics` bloqueado externamente (403)
- [ ] Firewall UFW ativo (portas 22, 80, 443 apenas)
- [ ] Renovação SSL automática configurada no cron
- [ ] Docker cleanup automático configurado
- [ ] Logs não contêm PII (user_id hasheado)
- [ ] Rate limiting funcionando (429 após excesso de requests)
- [ ] Timeout de execução funcionando (10s x86_64 / 15s ARM64)

---

## 8. Arquitetura

```
Internet
    │
    ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │  nginx   │───▶│ frontend │    │  runner  │
  │ (TLS 1.3)│    │ (nginx)  │    │ (Docker) │
  └────┬─────┘    └──────────┘    └──────────┘
       │
       ▼
  ┌──────────┐    ┌──────────────────┐
  │ backend  │───▶│  sandbox runner  │
  │ (Flask)  │    │  (qemu-user on   │
  └──────────┘    │   ARM64)         │
                  └──────────────────┘
       │
       ▼
  ┌──────────┐
  │ Supabase │
  │ (Auth)   │
  └──────────┘
```

---

## Referências

- [Terraform OCI Provider](https://registry.terraform.io/providers/oracle/oci/latest/docs)
- [Let's Encrypt](https://letsencrypt.org)
- [Certbot](https://certbot.eff.org)
- [Supabase Docs](https://supabase.com/docs)
- [Docker Docs](https://docs.docker.com)
- [Oracle Cloud Free Tier](https://www.oracle.com/cloud/free)
