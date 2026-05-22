"""WebSocket connectivity and protocol tests."""

import json

import pytest
from starlette.testclient import TestClient

from backend.app.main import app


@pytest.fixture
def client():
    return TestClient(app)


class TestHealthEndpoint:
    def test_health_returns_ok(self, client: TestClient):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json() == {"status": "ok"}


class TestWebSocketConnectivity:
    def test_websocket_connects(self, client: TestClient):
        """WebSocket handshake succeeds (no 403)."""
        with client.websocket_connect("/ws") as ws:
            # Connection accepted if we get here
            assert ws is not None

    def test_websocket_rejects_unknown_path(self, client: TestClient):
        """Unknown WebSocket paths return an error."""
        with pytest.raises(Exception):
            with client.websocket_connect("/unknown"):
                pass

    def test_websocket_text_header_accepted(self, client: TestClient):
        """Server accepts a text JSON frame header."""
        with client.websocket_connect("/ws") as ws:
            header = {"type": "frame", "id": 1, "w": 640, "h": 480}
            ws.send_text(json.dumps(header))
            # No crash; server is waiting for binary follow-up

    def test_websocket_frame_roundtrip(self, client: TestClient):
        """Send a dummy JPEG frame and get a DetectionResponse back."""
        with client.websocket_connect("/ws") as ws:
            header = {"type": "frame", "id": 42, "w": 640, "h": 480}
            ws.send_text(json.dumps(header))
            # Send minimal bytes (will fail to decode as JPEG, returning empty detections)
            ws.send_bytes(b"\xff\xd8\xff\xe0dummy")
            resp = json.loads(ws.receive_text())
            assert resp["frame_id"] == 42
            assert isinstance(resp["detections"], list)
            assert "infer_ms" in resp
            assert "server_ts" in resp

    def test_websocket_valid_jpeg_roundtrip(self, client: TestClient, bus_image_path):
        """Send a real JPEG and get detections back."""
        jpeg_bytes = bus_image_path.read_bytes()
        with client.websocket_connect("/ws") as ws:
            header = {"type": "frame", "id": 1, "w": 640, "h": 480}
            ws.send_text(json.dumps(header))
            ws.send_bytes(jpeg_bytes)
            resp = json.loads(ws.receive_text())
            assert resp["frame_id"] == 1
            assert len(resp["detections"]) > 0
            det = resp["detections"][0]
            assert "label" in det
            assert "confidence" in det
            assert "box" in det
            assert "zone_x" in det
            assert "zone_depth" in det

    def test_websocket_binary_without_header_ignored(self, client: TestClient):
        """Binary frame sent without a preceding text header is skipped."""
        with client.websocket_connect("/ws") as ws:
            # Send binary without header first
            ws.send_bytes(b"\xff\xd8\xff\xe0dummy")
            # Then send a proper frame pair
            header = {"type": "frame", "id": 99, "w": 640, "h": 480}
            ws.send_text(json.dumps(header))
            ws.send_bytes(b"\xff\xd8\xff\xe0dummy")
            resp = json.loads(ws.receive_text())
            assert resp["frame_id"] == 99

    def test_websocket_multiple_frames(self, client: TestClient):
        """Multiple frame roundtrips on the same connection."""
        with client.websocket_connect("/ws") as ws:
            for i in range(3):
                header = {"type": "frame", "id": i, "w": 640, "h": 480}
                ws.send_text(json.dumps(header))
                ws.send_bytes(b"\xff\xd8\xff\xe0dummy")
                resp = json.loads(ws.receive_text())
                assert resp["frame_id"] == i


class TestCORS:
    def test_cors_allowed_origin(self, client: TestClient):
        """CORS preflight from localhost:3000 is allowed."""
        resp = client.options(
            "/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"

    def test_cors_disallowed_origin(self, client: TestClient):
        """CORS preflight from unknown origin is not allowed."""
        resp = client.options(
            "/health",
            headers={
                "Origin": "http://evil.com",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert resp.headers.get("access-control-allow-origin") != "http://evil.com"
