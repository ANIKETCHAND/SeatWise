"""Routes: authentication, bootstrap, role discovery, and current user."""

from __future__ import annotations

import hmac
import time
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import AuthContext, get_auth
from ..config import get_settings
from ..database.client import require_db
from ..schemas.index import (
    BootstrapAdminRequest,
    ChangePasswordRequest,
    MeResponse,
    ResolveRollRequest,
)
from ..utils.rate_limiter import check_rate_limit

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=MeResponse)
def me(auth: AuthContext = Depends(get_auth)) -> MeResponse:
    """Return the authenticated caller's profile and active permissions."""
    return MeResponse(
        user_id=auth.user_id,
        email=auth.email,
        role=auth.role,
        full_name=auth.full_name,
        department=auth.department,
        account_status=auth.account_status,
        must_change_password=auth.must_change_password,
        permissions=sorted(list(auth.permissions)),
    )


@router.get("/status")
def status(auth: AuthContext = Depends(get_auth)) -> dict:
    """Database connectivity as observed by the backend."""
    try:
        require_db().table("programs").select("id", count="exact").limit(1).execute()
        db_ok = True
    except Exception:
        db_ok = False
    return {"authenticated": True, "role": auth.role, "database": "ok" if db_ok else "unreachable"}


@router.post("/resolve-roll")
def resolve_student_roll(payload: ResolveRollRequest, request: Request) -> dict:
    """Resolve a student's USN/roll number to their associated authentication email."""
    check_rate_limit(request, action="resolve_roll", max_requests=10, window_seconds=60)
    db = require_db()
    clean_roll = payload.roll_number.strip().upper()

    res = (
        db.table("students")
        .select("id,roll_number,full_name,email,auth_user_id")
        .ilike("roll_number", clean_roll)
        .limit(1)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="No registered student found with this roll number.")

    student = res.data[0]
    email = student.get("email")
    if not email:
        raise HTTPException(
            status_code=400,
            detail="Student account exists but does not have a linked login email. Please contact examination staff.",
        )

    # Provide masked email for confirmation
    parts = email.split("@")
    user_part = parts[0]
    domain_part = parts[1] if len(parts) > 1 else ""
    if len(user_part) > 2:
        masked_user = user_part[0] + "*" * (len(user_part) - 2) + user_part[-1]
    else:
        masked_user = user_part[0] + "*"
    masked_email = f"{masked_user}@{domain_part}"

    return {
        "found": True,
        "roll_number": student.get("roll_number"),
        "full_name": student.get("full_name"),
        "email": email,
        "masked_email": masked_email,
    }


@router.post("/change-password")
def change_password(
    payload: ChangePasswordRequest,
    auth: AuthContext = Depends(get_auth),
    request: Request = None,
) -> dict:
    """Allow an authenticated user to update their password and clear first-login prompt."""
    if request:
        check_rate_limit(request, action="change_password", max_requests=5, window_seconds=60)

    if len(payload.new_password) < 12:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 12 characters in accordance with institutional policy.",
        )

    db = require_db()
    # In demo mode under testing, bypass Supabase Auth API
    if auth.user_id.startswith("demo-"):
        return {"status": "success", "message": "Password updated successfully (testing mode)."}

    try:
        db.auth.admin.update_user_by_id(auth.user_id, {"password": payload.new_password})
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update password in authentication service: {exc}",
        ) from exc

    try:
        db.table("profiles").update({"must_change_password": False}).eq("id", auth.user_id).execute()
        db.table("audit_logs").insert(
            {
                "actor_user_id": auth.user_id,
                "action": "PASSWORD_CHANGED",
                "entity_type": "profile",
                "entity_id": auth.user_id,
                "details": {"action": "self_password_change"},
            }
        ).execute()
    except Exception:
        pass

    return {"status": "success", "message": "Password changed successfully."}


@router.post("/bootstrap-admin")
def bootstrap_admin(payload: BootstrapAdminRequest, request: Request) -> dict:
    """One-time bootstrap endpoint to provision initial administrator Aniket Chandra.

    Protected by INITIAL_ADMIN_BOOTSTRAP_SECRET and permanently locked once an active
    administrator exists.
    """
    check_rate_limit(request, action="bootstrap", max_requests=3, window_seconds=60)
    settings = get_settings()

    configured_secret = (settings.initial_admin_bootstrap_secret or "").strip()
    if not configured_secret:
        raise HTTPException(
            status_code=403,
            detail="Initial administrator bootstrap is not enabled or INITIAL_ADMIN_BOOTSTRAP_SECRET is not configured on the server.",
        )

    # Constant-time comparison
    if not hmac.compare_digest(payload.bootstrap_secret.strip(), configured_secret):
        raise HTTPException(status_code=403, detail="Invalid administrator bootstrap secret.")

    db = require_db()

    # 1. Check if bootstrap already completed via system_settings
    try:
        setting_res = (
            db.table("system_settings")
            .select("value")
            .eq("key", "bootstrap_completed")
            .execute()
        )
        if setting_res.data and setting_res.data[0].get("value") is True:
            raise HTTPException(
                status_code=403,
                detail="Initial administrator bootstrap has already been executed. Subsequent administrators must be created by an existing administrator.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # 2. Check if an active administrator already exists in profiles
    try:
        admins = (
            db.table("profiles")
            .select("id", count="exact")
            .eq("role", "admin")
            .eq("account_status", "active")
            .execute()
        )
        if (admins.count or 0) > 0:
            raise HTTPException(
                status_code=403,
                detail="An active administrator already exists in the system. Bootstrap is permanently disabled.",
            )
    except HTTPException:
        raise
    except Exception:
        pass

    # 3. Create or elevate Aniket Chandra in Supabase Auth
    target_email = payload.email.strip().lower()
    full_name = "Aniket Chandra"
    user_id = None

    try:
        # Attempt to create user via Auth Admin API
        user_res = db.auth.admin.create_user(
            {
                "email": target_email,
                "password": payload.password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "role": "admin"},
            }
        )
        if user_res and user_res.user:
            user_id = user_res.user.id
    except Exception as exc:
        # If user already exists in auth.users, fetch by listing or sign in
        try:
            users_list = db.auth.admin.list_users()
            for u in users_list:
                if u.email and u.email.lower() == target_email:
                    user_id = u.id
                    # Update password
                    db.auth.admin.update_user_by_id(user_id, {"password": payload.password})
                    break
        except Exception:
            pass

    if not user_id:
        raise HTTPException(
            status_code=500,
            detail="Could not provision or identify Supabase Auth account for administrator.",
        )

    # 4. Upsert Admin Profile in profiles table
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    db.table("profiles").upsert(
        {
            "id": user_id,
            "full_name": full_name,
            "email": target_email,
            "role": "admin",
            "department": "SeatWise Administration & Operations",
            "account_status": "active",
            "must_change_password": False,
            "updated_at": now_iso,
        }
    ).execute()

    # 5. Record bootstrap event in audit logs
    try:
        db.table("audit_logs").insert(
            {
                "actor_user_id": user_id,
                "action": "ADMIN_BOOTSTRAP",
                "entity_type": "profile",
                "entity_id": user_id,
                "target_user_id": user_id,
                "affected_resource": "system_bootstrap",
                "details": {
                    "event": "initial_admin_bootstrap",
                    "administrator": full_name,
                    "email": target_email,
                },
            }
        ).execute()
    except Exception:
        pass

    # 6. Mark bootstrap as completed in system_settings
    try:
        db.table("system_settings").upsert(
            {
                "key": "bootstrap_completed",
                "value": True,
                "description": "Initial administrator bootstrap completed flag",
                "updated_by": user_id,
            }
        ).execute()
    except Exception:
        pass

    return {
        "status": "success",
        "message": f"Initial administrator bootstrap completed successfully for {full_name}.",
        "user_id": user_id,
        "email": target_email,
        "role": "admin",
    }
