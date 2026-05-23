"""FastAPI application for AccessLens backend."""

import logging

import structlog
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from backend.app.ws import ws_endpoint

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.dev.ConsoleRenderer(),
    ],
    wrapper_class=structlog.stdlib.BoundLogger,
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
)
logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger(__name__)

app = FastAPI(title="AccessLens", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.websocket("/ws")
async def websocket_route(websocket: WebSocket) -> None:
    origin = websocket.headers.get("origin", "unknown")
    logger.info("WebSocket connection from origin: %s", origin)
    await ws_endpoint(websocket)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
