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


def safe_user_uuid(val: str | None) -> str | None:
    """Return val if it is a valid UUID string, otherwise return None.
    
    Prevents database type/foreign-key errors when user is authenticated
    via demo token or non-UUID identity that is not in auth.users.
    """
    if not val:
        return None
    try:
        uuid.UUID(str(val).strip())
        return str(val).strip()
    except (ValueError, TypeError, AttributeError):
        return None


def resolve_exam_id(db, identifier: str | None) -> str | None:
    """Resolve an examination UUID, temporary client identifier, or name to a database examination UUID."""
    if not identifier:
        return None
    val_str = str(identifier).strip()
    if not val_str:
        return None
    # 1. Exact UUID match if valid UUID format
    try:
        uuid.UUID(val_str)
        res = db.table("examinations").select("id").eq("id", val_str).limit(1).execute().data
        if res:
            return str(res[0]["id"])
    except (ValueError, TypeError, AttributeError):
        pass

    # 2. Known client default aliases
    patterns = {
        "EXAM-2026-1101": "%Mid-Term%",
        "EXAM-2026-1102": "%Semester End%",
        "EXAM-2026-1103": "%Postgraduate%",
    }
    pat = patterns.get(val_str.upper())
    if pat:
        try:
            res = db.table("examinations").select("id").ilike("name", pat).limit(1).execute().data
            if res:
                return str(res[0]["id"])
        except Exception:
            pass

    # 3. Match by name or partial name
    try:
        clean_pat = val_str.replace("%", "").strip()
        if len(clean_pat) >= 2:
            res = db.table("examinations").select("id").ilike("name", f"%{clean_pat}%").limit(1).execute().data
            if res:
                return str(res[0]["id"])
    except Exception:
        pass

    return None

