from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from services import cleanup

DF = {
    "Containers": [
        {"Id": "c1", "Names": ["/old"], "Image": "nginx", "State": "exited", "SizeRw": 120, "Created": 1700000000},
        {"Id": "c2", "Names": ["/live"], "Image": "redis", "State": "running", "SizeRw": 50, "Created": 1700000000},
        {"Id": "c3", "Names": ["/fresh"], "Image": "alpine", "State": "created", "Created": 1700000000},
    ],
    "Images": [
        {"Id": "i1", "RepoTags": [], "Size": 300, "SharedSize": 100, "Containers": 0, "Created": 1700000000},
        {"Id": "i2", "RepoTags": ["nginx:latest"], "Size": 500, "SharedSize": 0, "Containers": 0, "Created": 1},
        {"Id": "i3", "RepoTags": ["redis:7"], "Size": 400, "Containers": 1, "Created": 1},
        {"Id": "i4", "RepoTags": ["<none>:<none>"], "Size": 10, "Containers": -1, "Created": 1},
    ],
    "Volumes": [
        {
            "Name": "abc123",
            "Labels": {"com.docker.volume.anonymous": ""},
            "Mountpoint": "/var/lib/docker/volumes/abc123/_data",
            "CreatedAt": "2026-01-02T03:04:05.123456789Z",
            "UsageData": {"RefCount": 0, "Size": 64},
        },
        {"Name": "pgdata", "Labels": None, "UsageData": {"RefCount": 0, "Size": 2048}},
        {"Name": "busy", "Labels": {}, "UsageData": {"RefCount": 1, "Size": 9}},
        {"Name": "unknown", "Labels": {}, "UsageData": {"RefCount": -1, "Size": -1}},
    ],
    "BuildCache": [
        {"Size": 1000, "InUse": False, "Shared": False},
        {"Size": 200, "InUse": True, "Shared": False},
        {"Size": 300, "InUse": False, "Shared": True},
    ],
}


def test_stopped_containers_skips_running_and_strips_slash():
    result = cleanup.stopped_containers(DF)

    assert [item["id"] for item in result] == ["c1", "c3"]
    assert result[0]["name"] == "old"
    assert result[0]["size"] == 120
    assert result[0]["createdAt"] == 1700000000 * 1000
    assert result[1]["size"] == 0


def test_unused_images_marks_tagged_as_extended_and_counts_unique_size():
    result = {item["id"]: item for item in cleanup.unused_images(DF)}

    # Занятый контейнером и непосчитанный (-1) образы не предлагаем.
    assert set(result) == {"i1", "i2"}
    assert result["i1"] == {**result["i1"], "name": "<none>", "size": 200, "extended": False}
    assert result["i2"]["extended"] is True
    assert result["i2"]["name"] == "nginx:latest"


def test_unused_volumes_marks_named_as_extended():
    result = {item["id"]: item for item in cleanup.unused_volumes(DF)}

    assert set(result) == {"abc123", "pgdata"}
    assert result["abc123"]["extended"] is False
    assert result["abc123"]["createdAt"] > 0
    assert result["pgdata"]["extended"] is True
    assert result["pgdata"]["size"] == 2048


def test_build_cache_counts_only_reclaimable():
    assert cleanup.reclaimable_build_cache(DF) == 1000


def test_build_preview_handles_empty_df():
    preview = cleanup.build_preview({}, [])

    assert preview == {
        "containers": [],
        "images": [],
        "volumes": [],
        "networks": [],
        "builder": [],
        "builderSize": 0,
    }


@pytest.mark.parametrize(
    ("target", "all_unused", "call", "kwargs"),
    [
        ("images", False, "images.prune", {"filters": {"dangling": True}}),
        ("images", True, "images.prune", {"filters": {"dangling": False}}),
        ("volumes", False, "volumes.prune", {"filters": None}),
        ("volumes", True, "volumes.prune", {"filters": {"all": True}}),
        ("builder", False, "api.prune_builds", {"all": True}),
    ],
)
def test_prune_passes_filters_docker_understands(target, all_unused, call, kwargs):
    client = MagicMock()
    method = client
    for part in call.split("."):
        method = getattr(method, part)
    method.return_value = {"SpaceReclaimed": 42}

    result = cleanup.prune(client, target, all_unused)

    method.assert_called_once_with(**kwargs)
    assert result == {"deleted": 0, "reclaimed": 42}


def test_summarize_counts_deleted():
    assert cleanup.summarize({"ImagesDeleted": [{}, {}], "SpaceReclaimed": None}, "ImagesDeleted") == {
        "deleted": 2,
        "reclaimed": 0,
    }
