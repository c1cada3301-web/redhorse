from __future__ import annotations

import asyncio
from unittest.mock import MagicMock

import pytest
from docker.errors import APIError
from fastapi import HTTPException

from services import disk_usage


@pytest.fixture
def docker(monkeypatch):
    client = MagicMock()
    monkeypatch.setattr(disk_usage, "get_long_client", lambda: client)
    monkeypatch.setattr(disk_usage, "_BUSY_DELAY_S", 0)
    disk_usage.invalidate()
    yield client
    disk_usage.invalidate()


def _busy() -> APIError:
    return APIError("500", explanation="a disk usage operation is already running")


def test_parallel_requests_share_one_df(docker):
    docker.df.return_value = {"Images": []}

    async def both():
        return await asyncio.gather(disk_usage.disk_usage(), disk_usage.disk_usage())

    first, second = asyncio.run(both())

    assert first == second == {"Images": []}
    docker.df.assert_called_once()


def test_invalidate_forces_fresh_df(docker):
    docker.df.return_value = {}

    asyncio.run(disk_usage.disk_usage())
    disk_usage.invalidate()
    asyncio.run(disk_usage.disk_usage())

    assert docker.df.call_count == 2


def test_waits_while_docker_is_busy(docker):
    docker.df.side_effect = [_busy(), _busy(), {"Volumes": []}]

    assert asyncio.run(disk_usage.disk_usage()) == {"Volumes": []}


def test_gives_up_with_503_when_busy_too_long(docker):
    docker.df.side_effect = _busy()

    with pytest.raises(HTTPException) as caught:
        asyncio.run(disk_usage.disk_usage())

    assert caught.value.status_code == 503


def test_other_docker_errors_are_502(docker):
    docker.df.side_effect = APIError("500", explanation="boom")

    with pytest.raises(HTTPException) as caught:
        asyncio.run(disk_usage.disk_usage())

    assert caught.value.status_code == 502
