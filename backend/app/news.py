from __future__ import annotations

"""External crypto news integration.

This module fetches recent stories from cryptocurrency.cv, sanitizes them, and
returns a small frontend-friendly response shape.
"""

from datetime import UTC, datetime
import re
from typing import Any
from urllib.parse import urlparse

import httpx

from backend.app.schemas import NewsItem

NEWS_API_URL = "https://cryptocurrency.cv/api/news"
ALLOWED_NEWS_HOSTS = {"cryptocurrency.cv", "www.cryptocurrency.cv"}
MAX_HEADLINE_LENGTH = 180
MAX_SUMMARY_LENGTH = 280
WHITESPACE_RE = re.compile(r"\s+")


def _sanitize_text(value: Any, fallback: str = "") -> str:
    if not isinstance(value, str):
        return fallback

    cleaned = "".join(character for character in value if character.isprintable())
    cleaned = WHITESPACE_RE.sub(" ", cleaned).strip()
    return cleaned or fallback


def _normalize_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None

    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return None
    return value


def _is_english(item: dict[str, Any], combined_text: str) -> bool:
    for key in ("language", "lang", "locale"):
        raw = item.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.lower().startswith("en")

    if not combined_text:
        return False

    allowed = sum(1 for character in combined_text if character.isascii())
    return (allowed / max(len(combined_text), 1)) >= 0.92


def _normalize_published_at(item: dict[str, Any]) -> str:
    for key in ("publishedAt", "published_at", "published", "date", "createdAt"):
        raw = item.get(key)
        if isinstance(raw, str) and raw.strip():
            return raw.strip()

    raw_time_ago = item.get("timeAgo")
    if isinstance(raw_time_ago, str) and raw_time_ago.strip():
        return raw_time_ago.strip()

    return datetime.now(UTC).isoformat()


class CryptoNewsService:
    def __init__(self):
        self._http = httpx.AsyncClient(
            timeout=8.0,
            follow_redirects=True,
            headers={
                "Accept": "application/json",
                "Accept-Language": "en-US,en;q=0.9",
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/136.0.0.0 Safari/537.36 CryptoPredictionDashboard/1.0"
                ),
            },
        )

    async def close(self) -> None:
        await self._http.aclose()

    async def fetch_latest(self, limit: int = 6) -> list[NewsItem]:
        parsed = urlparse(NEWS_API_URL)
        if parsed.hostname not in ALLOWED_NEWS_HOSTS:
            raise ValueError("Unsupported news host configuration")

        response = await self._http.get(
            NEWS_API_URL,
            params={"limit": max(1, min(limit, 12))},
        )
        response.raise_for_status()

        payload = response.json()
        raw_items = payload.get("articles") if isinstance(payload, dict) else payload
        if not isinstance(raw_items, list):
            raise ValueError("Upstream news API returned an unexpected response shape")
        if not raw_items:
            raise ValueError(
                "The documented cryptocurrency.cv news endpoint returned zero articles to the backend request. "
                "The provider is reachable, but it currently appears unreliable for server-side use from this app."
            )

        normalized: list[NewsItem] = []
        for raw_item in raw_items:
            if not isinstance(raw_item, dict):
                continue

            headline = _sanitize_text(raw_item.get("title") or raw_item.get("headline"))
            summary = _sanitize_text(
                raw_item.get("summary")
                or raw_item.get("description")
                or raw_item.get("excerpt")
                or raw_item.get("content"),
            )
            combined_text = " ".join(part for part in (headline, summary) if part)
            if not _is_english(raw_item, combined_text):
                continue

            url = _normalize_url(raw_item.get("url") or raw_item.get("link"))
            if not headline or not summary or not url:
                continue

            source_value = raw_item.get("source")
            if isinstance(source_value, dict):
                source = _sanitize_text(source_value.get("name"), "Unknown source")
            else:
                source = _sanitize_text(source_value, "Unknown source")

            image_url = _normalize_url(
                raw_item.get("imageUrl")
                or raw_item.get("image")
                or raw_item.get("thumbnail")
            )

            published_at = _normalize_published_at(raw_item)
            normalized.append(
                NewsItem(
                    id=_sanitize_text(raw_item.get("id") or raw_item.get("slug") or url, url),
                    headline=headline[:MAX_HEADLINE_LENGTH],
                    source=source,
                    publishedAt=published_at,
                    summary=summary[:MAX_SUMMARY_LENGTH],
                    url=url,
                    imageUrl=image_url,
                ),
            )

            if len(normalized) >= limit:
                break

        if not normalized:
            raise ValueError(
                "The news provider returned items, but none passed the English-language and sanitization checks."
            )

        return normalized
