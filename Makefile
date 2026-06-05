sync-progress:
	@python3 scripts/sync_progress.py
	@echo "✓ PROGRESS.md atualizado"

.PHONY: lint-backend
lint-backend:
	cd backend && ruff check .

.PHONY: format-backend
format-backend:
	cd backend && ruff format --check .

.PHONY: lint-frontend
lint-frontend:
	cd frontend && npm run lint

.PHONY: lint
lint: lint-backend lint-frontend