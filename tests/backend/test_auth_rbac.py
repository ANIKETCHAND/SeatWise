"""Comprehensive automated test suite for SeatWise Four-Role Authentication,
RBAC Permission Boundaries, Administrator Controls, and Security Invariants.
"""

from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.config import get_settings


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    return {"Authorization": "Bearer demo-token-admin"}


@pytest.fixture
def staff_headers():
    return {"Authorization": "Bearer demo-token-exam_staff"}


@pytest.fixture
def faculty_headers():
    return {"Authorization": "Bearer demo-token-faculty"}


@pytest.fixture
def student_headers():
    return {"Authorization": "Bearer demo-token-student"}


# ==============================================================================
# 1. Administrator Capabilities & Safeguards
# ==============================================================================
class TestAdministratorRole:
    def test_admin_me_endpoint_returns_admin_profile(self, client, admin_headers):
        resp = client.get("/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin"
        assert "dashboard.view" in data["permissions"]
        assert "users.create" in data["permissions"]
        assert "users.reset_password" in data["permissions"]

    def test_admin_can_view_all_users(self, client, admin_headers):
        resp = client.get("/api/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "users" in data
        assert "counts" in data

    def test_admin_can_view_role_permissions_matrix(self, client, admin_headers):
        resp = client.get("/api/admin/roles/permissions", headers=admin_headers)
        assert resp.status_code == 200
        roles = resp.json()["roles"]
        assert "admin" in roles
        assert "exam_staff" in roles
        assert "faculty" in roles
        assert "student" in roles

    def test_admin_can_view_audit_logs(self, client, admin_headers):
        resp = client.get("/api/admin/audit-logs", headers=admin_headers)
        assert resp.status_code == 200
        assert "audit_logs" in resp.json()

    def test_admin_user_creation_validates_password_policy(self, client, admin_headers):
        # Short password (< 12 chars) must be rejected
        payload = {
            "full_name": "Test ShortPass",
            "email": "shortpass@jainuniversity.ac.in",
            "role": "faculty",
            "password": "short",
        }
        resp = client.post("/api/admin/users", json=payload, headers=admin_headers)
        assert resp.status_code == 422 or resp.status_code == 400

    def test_admin_can_provision_exam_staff_account(self, client, admin_headers):
        payload = {
            "full_name": "Exam Officer Test",
            "email": "exam.officer.test@jainuniversity.ac.in",
            "role": "exam_staff",
            "password": "SecurePassword123!",
            "department": "Examination Section",
            "must_change_password": True,
        }
        resp = client.post("/api/admin/users", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "success"
        assert data["user"]["role"] == "exam_staff"

    def test_admin_can_provision_faculty_account(self, client, admin_headers):
        payload = {
            "full_name": "Dr. Test Professor",
            "email": "prof.test@jainuniversity.ac.in",
            "role": "faculty",
            "password": "SecurePassword123!",
            "department": "Computer Science & Engineering",
        }
        resp = client.post("/api/admin/users", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "faculty"

    def test_admin_can_provision_student_account(self, client, admin_headers):
        payload = {
            "full_name": "Candidate Test",
            "email": "candidate.test@jainuniversity.ac.in",
            "role": "student",
            "password": "SecurePassword123!",
            "roll_number": "23JUTEST99",
            "semester": 4,
            "section": "A",
        }
        resp = client.post("/api/admin/users", json=payload, headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["user"]["role"] == "student"

    def test_admin_safeguard_prevents_removing_last_active_admin(self, client, admin_headers):
        # Attempting to deactivate the lone/last active admin triggers safeguard check with 400
        resp = client.post("/api/admin/users/usr-admin-01/deactivate", headers=admin_headers)
        assert resp.status_code == 400
        assert "Cannot demote or deactivate the last active system administrator" in resp.json()["detail"]

    def test_admin_safeguard_prevents_demoting_last_active_admin(self, client, admin_headers):
        # Attempting to demote the lone active admin to faculty triggers safeguard check with 400
        resp = client.patch("/api/admin/users/usr-admin-01", json={"role": "faculty"}, headers=admin_headers)
        assert resp.status_code == 400
        assert "Cannot demote or deactivate the last active system administrator" in resp.json()["detail"]

    def test_admin_operations_on_nonexistent_user_returns_404(self, client, admin_headers):
        resp = client.post("/api/admin/users/non-existent-user-id/deactivate", headers=admin_headers)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

        resp_reset = client.post(
            "/api/admin/users/non-existent-user-id/reset-password",
            json={"new_password": "NewSecurePassword123!"},
            headers=admin_headers,
        )
        assert resp_reset.status_code == 404


# ==============================================================================
# 2. Exam Staff Capabilities & Boundaries
# ==============================================================================
class TestExamStaffRole:
    def test_exam_staff_me_endpoint(self, client, staff_headers):
        resp = client.get("/api/auth/me", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "exam_staff"
        assert "examinations.create" in data["permissions"]
        assert "seating.generate" in data["permissions"]
        assert "users.create" not in data["permissions"]

    def test_exam_staff_can_view_examinations(self, client, staff_headers):
        resp = client.get("/api/examinations", headers=staff_headers)
        assert resp.status_code == 200

    def test_exam_staff_cannot_access_user_management(self, client, staff_headers):
        resp = client.get("/api/admin/users", headers=staff_headers)
        assert resp.status_code == 403
        assert "Administrator privileges required" in resp.json()["detail"]

    def test_exam_staff_cannot_create_user_accounts(self, client, staff_headers):
        payload = {
            "full_name": "Hacker User",
            "email": "hack@jainuniversity.ac.in",
            "role": "admin",
            "password": "Password123456!",
        }
        resp = client.post("/api/admin/users", json=payload, headers=staff_headers)
        assert resp.status_code == 403

    def test_exam_staff_cannot_access_audit_logs(self, client, staff_headers):
        resp = client.get("/api/admin/audit-logs", headers=staff_headers)
        assert resp.status_code == 403


# ==============================================================================
# 3. Faculty Capabilities & Boundaries
# ==============================================================================
class TestFacultyRole:
    def test_faculty_me_endpoint(self, client, faculty_headers):
        resp = client.get("/api/auth/me", headers=faculty_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "faculty"
        assert "timetable.view" in data["permissions"]
        assert "users.create" not in data["permissions"]
        assert "settings.manage" not in data["permissions"]

    def test_faculty_cannot_access_admin_users(self, client, faculty_headers):
        resp = client.get("/api/admin/users", headers=faculty_headers)
        assert resp.status_code == 403

    def test_faculty_cannot_manage_system_settings(self, client, faculty_headers):
        # Settings require admin
        resp = client.get("/api/admin/roles/permissions", headers=faculty_headers)
        assert resp.status_code == 403


# ==============================================================================
# 4. Student Capabilities & Boundaries
# ==============================================================================
class TestStudentRole:
    def test_student_me_endpoint(self, client, student_headers):
        resp = client.get("/api/auth/me", headers=student_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "student"
        assert "student.seat_lookup.self" in data["permissions"]
        assert "users.create" not in data["permissions"]
        assert "seating.publish" not in data["permissions"]

    def test_student_can_view_today_examinations(self, client, student_headers):
        resp = client.get("/api/student/examinations/today", headers=student_headers)
        assert resp.status_code == 200
        assert "examinations" in resp.json()

    def test_student_can_view_upcoming_examinations(self, client, student_headers):
        resp = client.get("/api/student/examinations/upcoming", headers=student_headers)
        assert resp.status_code == 200
        assert "examinations" in resp.json()

    def test_student_can_view_own_seat_lookup(self, client, student_headers):
        resp = client.get("/api/student/seat-lookup", headers=student_headers)
        assert resp.status_code == 200
        assert "allocations" in resp.json()

    def test_student_cannot_lookup_another_students_seat(self, client, student_headers):
        # Attempting to search for a DIFFERENT roll number must be rejected with 403
        resp = client.get("/api/student/seat-lookup?roll_number=DIFFERENT_ROLL_1234", headers=student_headers)
        assert resp.status_code == 403
        assert "Students may only inspect their own" in resp.json()["detail"]

    def test_student_cannot_access_admin_user_directory(self, client, student_headers):
        resp = client.get("/api/admin/users", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_access_audit_logs(self, client, student_headers):
        resp = client.get("/api/admin/audit-logs", headers=student_headers)
        assert resp.status_code == 403

    def test_staff_can_lookup_student_seat(self, client, staff_headers):
        resp = client.get("/api/student/seat-lookup?roll_number=23JU0101", headers=staff_headers)
        assert resp.status_code == 200
        assert "allocations" in resp.json()

    def test_staff_lookup_without_roll_requires_parameter(self, client, staff_headers):
        resp = client.get("/api/student/seat-lookup", headers=staff_headers)
        assert resp.status_code == 400

    def test_staff_lookup_nonexistent_roll_returns_empty_allocations(self, client, staff_headers):
        resp = client.get("/api/student/seat-lookup?roll_number=NONEXISTENT_999", headers=staff_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "allocations" in data
        assert len(data["allocations"]) == 0


# ==============================================================================
# 5. Roll Number Resolution & Student Login Flow
# ==============================================================================
class TestStudentRollResolution:
    def test_resolve_roll_valid_format(self, client):
        # Non-existent roll number returns 404
        resp = client.post("/api/auth/resolve-roll", json={"roll_number": "NONEXISTENT999"})
        assert resp.status_code == 404

    def test_resolve_roll_empty_fails_validation(self, client):
        resp = client.post("/api/auth/resolve-roll", json={"roll_number": ""})
        assert resp.status_code == 422

    def test_resolve_identifier_for_username_and_roll_number(self, client):
        # Roll number lookup
        resp = client.post("/api/auth/resolve-identifier", json={"identifier": "23JU0102"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["found"] is True
        assert "email" in data
        assert "@" in data["email"]

        # Assigned username lookup
        resp_admin = client.post("/api/auth/resolve-identifier", json={"identifier": "admin"})
        assert resp_admin.status_code == 200
        assert resp_admin.json()["type"] == "admin"


# ==============================================================================
# 6. Security Tests & Tamper Resistance
# ==============================================================================
class TestSecurityInvariants:
    def test_missing_bearer_token_rejected_with_401(self, client):
        resp = client.get("/api/auth/me")
        assert resp.status_code == 401
        assert "Missing bearer token" in resp.json()["detail"]

    def test_tampered_jwt_signature_rejected_with_401(self, client):
        tampered_token = (
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
            "eyJzdWIiOiJ1c3ItZmFrZSIsImVtYWlsIjoidGFtcGVyZWRAZXhhbXBsZS5jb20iLCJyb2xlIjoiYWRtaW4ifQ."
            "INVALID_SIGNATURE_BYTES_1234567890"
        )
        resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered_token}"})
        assert resp.status_code == 401

    def test_unauthorized_user_creation_fails(self, client):
        payload = {
            "full_name": "Unauthenticated Hacker",
            "email": "hacker@evil.com",
            "role": "admin",
            "password": "Password123456!",
        }
        resp = client.post("/api/admin/users", json=payload)
        assert resp.status_code == 401

    def test_bootstrap_admin_with_invalid_secret_fails(self, client):
        payload = {
            "bootstrap_secret": "wrong-secret-value",
            "email": "aniket.chandra@jainuniversity.ac.in",
            "password": "SecurePassword123!",
            "full_name": "Aniket Chandra",
        }
        resp = client.post("/api/auth/bootstrap-admin", json=payload)
        assert resp.status_code == 403

    def test_rate_limiting_enforcement_returns_429(self, client):
        # Rapidly sending requests exceeding limit must trigger HTTP 429
        # Action 'bootstrap' max_requests is 3 in a 60s window
        last_status = None
        for i in range(5):
            resp = client.post(
                "/api/auth/bootstrap-admin",
                json={
                    "bootstrap_secret": f"test-attempt-{i}",
                    "email": "test@jainuniversity.ac.in",
                    "password": "Password123456!",
                },
                headers={"X-Forwarded-For": "198.51.100.42"},
            )
            last_status = resp.status_code

        assert last_status == 429


# ==============================================================================
# 5. Student Privilege Isolation and Tenant Boundaries
# ==============================================================================
class TestStudentPrivilegeIsolation:
    def test_student_cannot_list_all_institutional_plans(self, client, student_headers):
        resp = client.get("/api/seating/plans", headers=student_headers)
        assert resp.status_code == 403
        resp_hist = client.get("/api/history", headers=student_headers)
        assert resp_hist.status_code == 403

    def test_student_cannot_export_plan_csv(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/reports/plan/{dummy_id}/csv", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_export_exam_csv(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/reports/exam/{dummy_id}/csv", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_lookup_other_students_via_exam_lookup(self, client, student_headers):
        # Demo student is 23JU0102; querying 23JU0999 must return empty matches
        resp = client.get("/api/seating/examination/lookup?q=23JU0999", headers=student_headers)
        assert resp.status_code in (200, 503)
        if resp.status_code == 200:
            assert resp.json()["matches"] == []

    def test_student_cannot_list_examination_plans(self, client, student_headers):
        resp = client.get("/api/seating/examination/plans", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_get_examination_plan_detail(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/seating/examination/{dummy_id}", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_list_classroom_plans(self, client, student_headers):
        resp = client.get("/api/seating/classroom/plans", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_get_classroom_plan_detail(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/seating/classroom/{dummy_id}", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_list_all_examinations(self, client, student_headers):
        resp = client.get("/api/examinations", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_get_examination_admin_detail(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/examinations/{dummy_id}", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_export_locator_pdf(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/reports/examination/{dummy_id}/locator/pdf", headers=student_headers)
        assert resp.status_code == 403

    def test_student_cannot_fetch_locator_records(self, client, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000001"
        resp = client.get(f"/api/reports/examination/{dummy_id}/locator", headers=student_headers)
        assert resp.status_code == 403

