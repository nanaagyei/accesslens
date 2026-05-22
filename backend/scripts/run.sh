#!/bin/bash
# Start the AccessLens backend server
set -e
cd "$(dirname "$0")/../.."
exec .venv/bin/uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
