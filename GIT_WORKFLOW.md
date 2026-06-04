# Git Workflow

## Estrutura de Branches

- **main**: Produção (protegida)
- **dev**: Desenvolvimento (branch padrão, protegida)
- **issue-N-description**: Branches de trabalho

## Workflow para Issues

### 1. Criar branch da issue

```bash
# A partir da dev
git checkout dev
git pull origin dev

# Criar branch específica (exemplo: issue #17)
git checkout -b issue-17-compile-endpoint
```

### 2. Desenvolver

```bash
# Fazer commits atômicos
git add .
git commit -m "feat(backend): add compile endpoint with simplesc

- Create /api/compile POST endpoint
- Invoke simplesc with timeout
- Return NASM or errors

Refs #17"
```

### 3. Push e Pull Request

```bash
# Push da branch
git push -u origin issue-17-compile-endpoint

# Criar PR via gh CLI
gh pr create \
  --base dev \
  --title "feat(backend): add compile endpoint with simplesc" \
  --body "Implements #17

## Changes
- POST /api/compile endpoint
- simplesc invocation with timeout
- Error handling

## Testing
- Manual test with curl"
```

### 4. Merge

Após revisão, merge via GitHub (squash ou merge commit conforme preferência).

## Convenções

### Nome de branch
- Formato: `issue-<número>-<descrição-curta>`
- Exemplo: `issue-17-compile-endpoint`

### Commits
- Formato: [Conventional Commits](https://www.conventionalcommits.org/)
- Prefixos: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- Escopo: `(backend)`, `(frontend)`, `(devops)`, `(docs)`
- Sempre referenciar issue: `Refs #N` ou `Resolves #N`

### Pull Requests
- Base: sempre `dev` (exceto hotfixes em `main`)
- Título: mesmo do commit principal
- Body: descrever mudanças, testes, referências

## Proteção de Branches

Configure no GitHub:
- `main`: require PR + 1 approval
- `dev`: require PR (opcional: require CI pass)

## Release para Produção

```bash
# Quando dev estiver estável
git checkout main
git merge dev
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags
```
