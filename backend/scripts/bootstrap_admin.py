"""Command-line administrator bootstrap script for SeatWise.

Provisions the initial verified administrator (Aniket Chandra) with full administrative
privileges, audit-logging, and permanent one-time bootstrap locking.
"""

from __future__ import annotations

import argparse
import getpass
import os
import sys
import time

# Ensure backend root is on sys.path
backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

from app.database.client import admin_client, require_db


def bootstrap(email: str, password: str | None = None, secret: str | None = None):
    print("============================================================")
    print("SeatWise — Initial Administrator Bootstrap (Aniket Chandra)")
    print("============================================================")

    db = require_db()

    # 1. Check if active administrator already exists
    try:
        admins = (
            db.table("profiles")
            .select("id,email,full_name", count="exact")
            .eq("role", "admin")
            .eq("account_status", "active")
            .execute()
        )
        if (admins.count or 0) > 0:
            print(f"[ERROR] Bootstrap failed: An active administrator already exists in the system ({admins.data[0].get('email')}).")
            print("Subsequent administrators must be created through the Administrator User Management Panel.")
            sys.exit(1)
    except Exception as e:
        print(f"[WARNING] Database check encountered: {e}")

    # 2. Check if bootstrap was marked completed
    try:
        sett = db.table("system_settings").select("value").eq("key", "bootstrap_completed").execute()
        if sett.data and sett.data[0].get("value") is True:
            print("[ERROR] Bootstrap failed: Bootstrap has already been marked completed.")
            sys.exit(1)
    except Exception:
        pass

    target_email = email.strip().lower()
    full_name = "Aniket Chandra"

    if not password:
        password = getpass.getpass("Enter secure password for Aniket Chandra (min 12 chars): ")

    if len(password) < 12:
        print("[ERROR] Password must be at least 12 characters.")
        sys.exit(1)

    print(f"Provisioning administrator account for: {full_name} <{target_email}>...")

    user_id = None
    # 3. Create or elevate user in Supabase Auth
    try:
        res = db.auth.admin.create_user(
            {
                "email": target_email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"full_name": full_name, "role": "admin"},
            }
        )
        if res and res.user:
            user_id = res.user.id
            print(f"[SUCCESS] Supabase Auth account created with UID: {user_id}")
    except Exception as exc:
        print(f"[INFO] User creation in Auth Admin reported: {exc}. Looking up existing user...")
        try:
            for u in db.auth.admin.list_users():
                if u.email and u.email.lower() == target_email:
                    user_id = u.id
                    db.auth.admin.update_user_by_id(user_id, {"password": password})
                    print(f"[SUCCESS] Linked to existing Auth user UID: {user_id} and updated credentials.")
                    break
        except Exception as lookup_err:
            print(f"[ERROR] Could not resolve Supabase Auth user: {lookup_err}")
            sys.exit(1)

    if not user_id:
        print("[ERROR] Failed to obtain valid Supabase Auth user ID.")
        sys.exit(1)

    # 4. Insert or update profile
    now_iso = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    db.table("profiles").upsert(
        {
            "id": user_id,
            "full_name": full_name,
            "email": target_email,
            "role": "admin",
            "department": "SeatWise Executive Administration",
            "account_status": "active",
            "must_change_password": False,
            "updated_at": now_iso,
        }
    ).execute()
    print("[SUCCESS] Database profile updated: Role = 'admin', Status = 'active'.")

    # 5. Insert audit log
    try:
        db.table("audit_logs").insert(
            {
                "actor_user_id": user_id,
                "action": "ADMIN_BOOTSTRAP_CLI",
                "entity_type": "profile",
                "entity_id": user_id,
                "target_user_id": user_id,
                "affected_resource": "system_bootstrap",
                "details": {"administrator": full_name, "email": target_email, "method": "cli"},
            }
        ).execute()
        print("[SUCCESS] Bootstrap event recorded in audit logs.")
    except Exception as e:
        print(f"[WARNING] Could not record audit log: {e}")

    # 6. Lock bootstrap in system_settings
    try:
        db.table("system_settings").upsert(
            {
                "key": "bootstrap_completed",
                "value": True,
                "description": "Initial administrator bootstrap completed flag",
                "updated_by": user_id,
            }
        ).execute()
        print("[SUCCESS] Bootstrap state locked. Future bootstrap attempts are permanently disabled.")
    except Exception:
        pass

    print("\n------------------------------------------------------------")
    print(f"Administrator {full_name} ({target_email}) is now ready!")
    print("Sign in at: https://seatwise-fet.vercel.app/login/admin or http://localhost:5173/login/admin")
    print("------------------------------------------------------------")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SeatWise Initial Administrator Bootstrap")
    parser.add_argument("--email", required=True, help="Verified institutional email for Aniket Chandra")
    parser.add_argument("--password", required=False, help="Initial secure password (minimum 12 characters)")
    args = parser.parse_args()

    bootstrap(email=args.email, password=args.password)
