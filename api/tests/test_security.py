from __future__ import annotations

from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import auth
from app import app, resolve_static
from config import get_settings
from routers import auth as auth_router
from security import origin_allowed

HOST = "testserver"
SAME_ORIGIN = {"Origin": f"http://{HOST}"}


@pytest.fixture(scope="module")
def client():
    db = Path(get_settings().database_url.split("///")[-1])
    db.unlink(missing_ok=True)
    with TestClient(app) as test_client:
        yield test_client
    db.unlink(missing_ok=True)


# --- статика ------------------------------------------------------------------


def test_static_stays_inside_root(tmp_path: Path) -> None:
    root = tmp_path / "static"
    root.mkdir()
    (root / "index.html").write_text("index")
    (tmp_path / "secret.db").write_text("secret")

    assert resolve_static("index.html", root.resolve()) == (root / "index.html").resolve()
    assert resolve_static("../secret.db", root.resolve()) is None
    assert resolve_static("/etc/passwd", root.resolve()) is None
    assert resolve_static("", root.resolve()) is None


# --- Origin -------------------------------------------------------------------


@pytest.mark.parametrize(
    ("origin", "expected"),
    [
        (None, True),
        ("http://panel:9000", True),
        ("https://panel:9000", True),
        ("http://panel:8080", False),
        ("http://evil.example", False),
        ("null", False),
        ("http://dev:3003", True),
    ],
)
def test_origin_allowed(origin: str | None, expected: bool) -> None:
    assert origin_allowed(origin, ("panel:9000", ""), ("http://dev:3003",)) is expected


def test_cross_origin_post_rejected(client: TestClient) -> None:
    response = client.post("/api/auth/logout", headers={"Origin": "http://testserver:8080"})
    assert response.status_code == 403


def test_cross_origin_websocket_rejected(client: TestClient) -> None:
    from starlette.websockets import WebSocketDisconnect

    with pytest.raises(WebSocketDisconnect) as caught:
        with client.websocket_connect("/api/system/stats/stream", headers={"Origin": "http://evil.example"}):
            pass
    assert caught.value.code == 1008


# --- заголовки и схема --------------------------------------------------------


def test_security_headers(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "frame-ancestors 'none'" in response.headers["content-security-policy"]


def test_docs_hidden_in_production(client: TestClient) -> None:
    for path in ("/docs", "/redoc", "/openapi.json"):
        assert "swagger" not in client.get(path).text.lower()
    assert client.get("/openapi.json").status_code == 404


# --- вход ---------------------------------------------------------------------


def test_setup_window_closes(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(auth_router, "setup_window_open", lambda: False)
    response = client.post(
        "/api/auth/bootstrap", json={"username": "late", "password": "password123"}, headers=SAME_ORIGIN
    )
    assert response.status_code == 403
    assert client.get("/api/auth/state").json() == {"initialized": False, "setupOpen": False}


def test_logout_revokes_token(client: TestClient) -> None:
    created = client.post(
        "/api/auth/bootstrap", json={"username": "admin", "password": "password123"}, headers=SAME_ORIGIN
    )
    assert created.status_code == 201
    cookie = client.cookies.get(get_settings().session_cookie)
    assert "samesite=strict" in created.headers["set-cookie"].lower()

    assert client.get("/api/auth/me").status_code == 200
    assert client.post("/api/auth/logout", headers=SAME_ORIGIN).status_code == 204

    # Копия cookie, сохранённая до выхода, больше не пускает.
    client.cookies.set(get_settings().session_cookie, cookie)
    assert client.get("/api/auth/me").status_code == 401


def test_token_without_jti_rejected() -> None:
    import jwt

    legacy = jwt.encode({"sub": "1", "exp": 9_999_999_999}, auth.secret(), algorithm=auth.ALGORITHM)
    assert auth.decode_token(legacy) is None
