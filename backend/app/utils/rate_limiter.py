"""In-memory rate limiter for authentication, bootstrap, and password endpoints.

Thread-safe and lightweight; provides brute-force mitigation per client IP and endpoint.
"""

from __future__ import annotations

import time
from collections import defaultdict
from threading import Lock
from fastapi import HTTPException, Request

_RATE_LOCK = Lock()
_ATTEMPTS: dict[str, list[float]] = defaultdict(list)


def check_rate_limit(
    request: Request,
    action: str = "auth",
    max_requests: int = 10,
    window_seconds: int = 60,
) -> None:
    """Check request frequency against client IP. Raises HTTP 429 if rate exceeded."""
    client_ip = (
        request.headers.get("x-forwarded-for", "").split(",")[0].strip()
        or (request.client.host if request.client else "unknown")
    )
    key = f"{action}:{client_ip}"
    now = time.time()
    cutoff = now - window_seconds

    with _RATE_LOCK:
        times = [t for t in _ATTEMPTS[key] if t > cutoff]
        if len(times) >= max_requests:
            retry_after = int(window_seconds - (now - times[0]))
            raise HTTPException(
                status_code=429,
                detail=f"Too many {action} attempts. Please wait {max(1, retry_after)} seconds before trying again.",
                headers={"Retry-After": str(max(1, retry_after))},
            )
        times.append(now)
        _ATTEMPTS[key] = times
