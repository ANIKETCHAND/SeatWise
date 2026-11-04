"""Supabase clients.

- admin_client: service-role key, used by the backend for ALL data
  operations. Never exposed to the frontend.
- The frontend uses the anon key directly only for authentication.
"""

from __future__ import annotations

from functools import lru_cache

from supabase import Client, create_client

from ..config import get_settings


class DatabaseNotConfigured(RuntimeError):
    """Raised when Supabase credentials are missing."""


@lru_cache
def admin_client() -> Client:
    settings = get_settings()
    if not settings.is_database_configured:
        raise DatabaseNotConfigured(
            "Supabase is not configured. Set SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY in the backend environment."
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


def require_db() -> Client:
    return admin_client()
