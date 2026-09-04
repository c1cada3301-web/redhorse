from __future__ import annotations

import httpx

# Официальные образы лежат в library, но пишутся коротко: nginx вместо library/nginx.
_HUB_TAGS = "https://hub.docker.com/v2/repositories/{repository}/tags"
_TIMEOUT = 8.0


def normalize_repository(repository: str) -> str:
    """Приводит имя к тому виду, в котором его знает Hub API."""
    name = repository.strip().split(":")[0]

    return name if "/" in name else f"library/{name}"


def fetch_tags(repository: str, limit: int = 40) -> list[str]:
    """
    Список тегов образа из Docker Hub.

    Демон такого не отдаёт: `docker search` знает только репозитории, поэтому
    за тегами идём в публичный API Hub. Ошибка сети — пустой список, а не отказ
    всей формы: теги можно и вписать руками.
    """
    url = _HUB_TAGS.format(repository=normalize_repository(repository))

    try:
        response = httpx.get(url, params={"page_size": limit, "ordering": "last_updated"}, timeout=_TIMEOUT)
        response.raise_for_status()
    except httpx.HTTPError:
        return []

    results = response.json().get("results", [])

    return [item["name"] for item in results if isinstance(item.get("name"), str)]
