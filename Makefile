.PHONY: setup setup-backend setup-frontend run run-backend run-frontend test test-backend test-frontend benchmark eval-frames fmt lint

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

test: test-backend test-frontend

test-backend:
	.venv/bin/pytest backend/tests -v

test-frontend:
	cd frontend && npm test

benchmark:
	.venv/bin/python backend/scripts/benchmark.py

eval-frames:
	.venv/bin/python eval/save_frames.py

fmt:
	.venv/bin/ruff format backend/
	cd frontend && npx prettier --write .

lint:
	.venv/bin/ruff check backend/
	.venv/bin/mypy backend/app/
	cd frontend && npx tsc --noEmit
