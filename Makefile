.PHONY: setup setup-backend setup-frontend run run-backend run-frontend test benchmark fmt lint

setup: setup-backend setup-frontend

setup-backend:
	python3 -m venv .venv
	.venv/bin/pip install --upgrade pip
	.venv/bin/pip install -e ".[dev]"

setup-frontend:
	cd frontend && npm install

run-backend:
	.venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload

run-frontend:
	cd frontend && npm run dev

run:
	@echo "Start backend and frontend in separate terminals:"
	@echo "  Terminal 1: make run-backend"
	@echo "  Terminal 2: make run-frontend"

test:
	.venv/bin/pytest backend/tests -v

benchmark:
	.venv/bin/python backend/scripts/benchmark.py

fmt:
	.venv/bin/ruff format backend/
	cd frontend && npx prettier --write .

lint:
	.venv/bin/ruff check backend/
	.venv/bin/mypy backend/app/
	cd frontend && npx tsc --noEmit
