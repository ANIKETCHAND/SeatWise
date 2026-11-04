"""UUID helper and normalization for database entities."""

from __future__ import annotations

import uuid


def ensure_uuid(val: str | None, prefix: str = "seatwise") -> str | None:
    """Normalize input into a valid RFC 4122 UUID.

    If val is already a valid UUID string, return it as-is.
    If val is a human-readable identifier (e.g. 'LH-101', '23JU0101', 'rm-201'),
    derive a deterministic RFC 4122 v5 UUID from the namespace.
    If val is None or empty, return None.
    """
    if not val:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        uuid.UUID(val_str)
        return val_str
    except (ValueError, TypeError, AttributeError):
        return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{prefix}:{val_str}"))
