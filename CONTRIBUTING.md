# Contributing

## Reporting Issues

Open a [GitHub Issue](https://github.com/IncludeLuisFerreira/Simples-editor/issues/new/choose) using the provided template. Include steps to reproduce, expected behavior, and environment details.

## Development Workflow

See [docs/GIT_WORKFLOW.md](docs/GIT_WORKFLOW.md) for full branch strategy, commit conventions, and PR process.

### Quick start

```bash
git checkout dev
git pull origin dev
git checkout -b issue-<N>-<short-description>
# make changes
git add .
git commit -m "type(scope): description
Refs #N"
git push -u origin issue-<N>-<short-description>
gh pr create --base dev --title "type(scope): description" --body "Implements #N"
```

### Commit conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope):` — new feature
- `fix(scope):` — bug fix
- `docs(scope):` — documentation
- `refactor(scope):` — code restructuring
- `test(scope):` — tests
- `chore(scope):` — maintenance

Scopes: `backend`, `frontend`, `devops`, `docs`.

Always reference the issue: `Refs #N` or `Resolves #N`.

## Local Linting

Run all linters before pushing:

```bash
make lint           # Backend (ruff) + Frontend (ESLint)
make lint-backend   # Backend only
make lint-frontend  # Frontend only
```

## License

By contributing, you agree that your contributions will be licensed under the MIT License.