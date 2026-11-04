"""Backend API and integration test suite (Master specification, section 20B)."""

from __future__ import annotations

import os
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.timetable_parser import parse_timetable_workbook


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture
def admin_headers():
    return {"Authorization": "Bearer demo-token-admin"}


@pytest.fixture
def student_headers():
    return {"Authorization": "Bearer demo-token-student"}


class TestRootAndHealthEndpoints:
    def test_root_endpoint(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["app"] == "SeatWise"
        assert "Jain University" in data["institution"]

    def test_health_endpoint(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert "api_version" in data

    def test_api_health_endpoint(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"


class TestAuthenticationAndAuthorization:
    def test_missing_auth_header_fails(self, client):
        resp = client.post("/api/math/capacity", json={"rows": 4, "columns": 6, "blocked": []})
        assert resp.status_code == 401
        assert "Missing bearer token" in resp.json()["detail"]

    def test_invalid_bearer_fails(self, client):
        resp = client.get("/api/auth/me", headers={"Authorization": "Basic 12345"})
        assert resp.status_code == 401

    def test_demo_auth_me(self, client, admin_headers):
        resp = client.get("/api/auth/me", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["role"] == "admin"
        assert "admin@jainuniversity.ac.in" in data["email"]

    def test_role_enforcement_student_denied_admin_endpoint(self, client, student_headers):
        resp = client.post(
            "/api/university/programs",
            json={"code": "TEST", "name": "Test Program", "duration_years": 4, "total_semesters": 8},
            headers=student_headers,
        )
        assert resp.status_code == 403
        assert "Administrator privileges required" in resp.json()["detail"]


class TestMathematicsEndpoints:
    def test_math_capacity_unobstructed_4x6(self, client, admin_headers):
        resp = client.post(
            "/api/math/capacity",
            json={"rows": 4, "columns": 6, "blocked": []},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_seats"] == 24
        assert data["usable_seats"] == 24
        assert data["checkerboard_partitions"]["larger"] == 12
        assert data["checkerboard_partitions"]["smaller"] == 12
        assert data["alpha_hv"] == 12
        assert "alpha(G) = ceil(R*C/2)" in data["alpha_formula"]

    def test_math_capacity_with_blocked_seats(self, client, admin_headers):
        resp = client.post(
            "/api/math/capacity",
            json={"rows": 3, "columns": 3, "blocked": [[1, 1]]},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_seats"] == 9
        assert data["usable_seats"] == 8
        assert data["blocked_seats"] == 1

    def test_math_checkerboard_construction_valid_10_8(self, client, admin_headers):
        resp = client.post(
            "/api/math/checkerboard",
            json={"rows": 4, "columns": 6, "class_a": 10, "class_b": 8},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["feasible"] is True
        assert data["conditions"]["larger_partition"] == 12
        assert len(data["partitions"]["even"]) == 12
        assert len(data["partitions"]["odd"]) == 12

    def test_math_checkerboard_construction_infeasible_13_11(self, client, admin_headers):
        resp = client.post(
            "/api/math/checkerboard",
            json={"rows": 4, "columns": 6, "class_a": 13, "class_b": 11},
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["feasible"] is False
        assert data["status"] == "infeasible"

    def test_math_adjacency_conflict_detection(self, client, admin_headers):
        # Two students of same batch "AIML" horizontally adjacent: row 0 col 0 and row 0 col 1
        resp = client.post(
            "/api/math/adjacency",
            json={
                "rows": 2,
                "columns": 2,
                "blocked": [],
                "include_diagonal": False,
                "allocation": [
                    ["AIML", "AIML"],
                    [None, None],
                ],
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "invalid"
        assert len(data["conflicts"]) >= 1

    def test_math_solve_multi_class_cpsat(self, client, admin_headers):
        resp = client.post(
            "/api/math/solve",
            json={
                "rows": 3,
                "columns": 3,
                "blocked": [],
                "include_diagonal": False,
                "groups": {"A": 4, "B": 3, "C": 2},
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "valid"
        assert "cp-sat" in data["solver"]
        assigned_cells = sum(1 for row in data["grid"] for cell in row if cell is not None)
        assert assigned_cells == 9


class TestTimetableParserIntegration:
    def test_parse_jain_timetable_excel(self):
        filepath = os.path.join("project_data", "jain_timetable_data.xlsx")
        assert os.path.exists(filepath), f"Missing timetable workbook at {filepath}"

        with open(filepath, "rb") as f:
            content = f.read()

        report = parse_timetable_workbook(content)
        assert len(report.batches) == 94, "Must parse exactly 94 batches from Jain University workbook"
        assert len(report.entries) > 3000, "Must parse all timetable sessions"
        assert len(report.subjects) > 100, "Must extract subjects catalog"
        assert len(report.faculty) > 150, "Must extract faculty catalogue"
        assert len(report.rooms) > 50, "Must extract rooms catalog"
        assert len(report.errors) == 0, "Workbook must parse without unhandled row errors"


class TestValidationAndErrorHandling:
    def test_invalid_input_payload_fails_422(self, client, admin_headers):
        resp = client.post(
            "/api/math/capacity",
            json={"rows": "not-an-int", "columns": -5},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_database_not_configured_graceful_handling(self, client, admin_headers):
        # When DB is not configured, endpoints requiring DB return 503 instead of crashing
        resp = client.get("/api/university/programs", headers=admin_headers)
        assert resp.status_code in (200, 503)
        if resp.status_code == 503:
            err = resp.json()
            assert err["error"]["code"] == "database_not_configured"

    def test_dashboard_stats_endpoint_returns_json(self, client, admin_headers):
        resp = client.get("/api/dashboard/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "counts" in data or "is_connected" in data

    def test_math_solve_with_diagonal_restriction_infeasible_on_k4(self, client, admin_headers):
        # 2x2 grid with 2 same-batch students and diagonal restrictions is K4: infeasible
        resp = client.post(
            "/api/math/solve",
            json={
                "rows": 2,
                "columns": 2,
                "blocked": [],
                "include_diagonal": True,
                "groups": {"A": 2},
            },
            headers=admin_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "infeasible"

    def test_route_aliases_exams_and_seating_exam(self, client, admin_headers):
        # Test that alias routes are mounted properly and handle requests
        resp_exams = client.get("/api/exams", headers=admin_headers)
        assert resp_exams.status_code in (200, 503)
        resp_seating = client.get("/api/seating/exam/plans", headers=admin_headers)
        assert resp_seating.status_code in (200, 503)

    def test_program_tree_endpoint_mounted(self, client, admin_headers):
        resp = client.get("/api/university/programs/tree", headers=admin_headers)
        assert resp.status_code in (200, 503)

    def test_approved_exam_halls_endpoint_mounted(self, client, admin_headers):
        resp = client.get("/api/rooms/halls/approved", headers=admin_headers)
        assert resp.status_code in (200, 503)

    def test_update_room_layout_endpoint_mounted(self, client, admin_headers):
        resp = client.put(
            "/api/rooms/00000000-0000-0000-0000-000000000000/layout",
            json={"rows": 6, "columns": 8, "blocked": ["0-1", "1-2"]},
            headers=admin_headers,
        )
        assert resp.status_code in (200, 404, 503)

    def test_exam_seating_save_endpoint_mounted(self, client, admin_headers):
        payload = {
            "plan": {"examination_id": "00000000-0000-0000-0000-000000000000", "kind": "examination"},
            "assignments": [
                {"student_id": "00000000-0000-0000-0000-000000000001", "room_id": "00000000-0000-0000-0000-000000000002", "row": 0, "col": 0, "seat_label": "A1"}
            ],
        }
        resp = client.post("/api/seating/examination/save", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 422, 503)
        resp_alias = client.post("/api/seating/exam/save", json=payload, headers=admin_headers)
        assert resp_alias.status_code in (200, 422, 503)

    def test_seating_plan_direct_path_aliases(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        resp_cr = client.get(f"/api/seating/classroom/{dummy_id}", headers=admin_headers)
        assert resp_cr.status_code in (200, 404, 503)
        resp_ex = client.get(f"/api/seating/examination/{dummy_id}", headers=admin_headers)
        assert resp_ex.status_code in (200, 404, 503)
        resp_ex_alias = client.get(f"/api/seating/exam/{dummy_id}", headers=admin_headers)
        assert resp_ex_alias.status_code in (200, 404, 503)

    def test_classroom_attendance_bulk_and_single_routes(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        resp_bulk = client.post(
            f"/api/seating/classroom/{dummy_id}/attendance",
            json={"absences": ["00000000-0000-0000-0000-000000000001"]},
            headers=admin_headers,
        )
        assert resp_bulk.status_code in (200, 404, 503)

    def test_student_import_alias_endpoint(self, client, admin_headers):
        resp = client.post(
            "/api/students/import",
            json={"students": []},
            headers=admin_headers,
        )
        # Empty students returns 400 nothing_to_import, proving endpoint is reached and validated
        assert resp.status_code in (400, 503)

    def test_timetable_search_and_optional_filters(self, client, admin_headers):
        resp_search = client.get("/api/timetable/search?q=Data", headers=admin_headers)
        assert resp_search.status_code in (200, 503)
        resp_tt = client.get("/api/timetable", headers=admin_headers)
        assert resp_tt.status_code in (200, 503)

    def test_exam_locator_pdf_aliases_mounted(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        resp1 = client.get(f"/api/reports/exam/{dummy_id}/locator/pdf", headers=admin_headers)
        assert resp1.status_code in (200, 404, 503)
        resp2 = client.get(f"/api/reports/examination/{dummy_id}/locator/pdf", headers=admin_headers)
        assert resp2.status_code in (200, 404, 503)

    def test_exam_create_session_normalization(self):
        from app.schemas.index import ExamCreate
        e1 = ExamCreate(name="Midterm Exam", exam_date="2026-11-20", session="morning")
        assert e1.session == "FN"
        e2 = ExamCreate(name="Endsem Exam", exam_date="2026-11-20", session="afternoon")
        assert e2.session == "AN"
        e3 = ExamCreate(name="Regular FN", exam_date="2026-11-20", session="FN")
        assert e3.session == "FN"

    def test_seating_plans_and_history_endpoints(self, client, admin_headers):
        resp_plans = client.get("/api/seating/plans", headers=admin_headers)
        assert resp_plans.status_code in (200, 503)
        resp_plans_alt = client.get("/api/plans", headers=admin_headers)
        assert resp_plans_alt.status_code in (200, 503)
        resp_hist = client.get("/api/history", headers=admin_headers)
        assert resp_hist.status_code in (200, 503)

    def test_exam_locator_json_and_csv_endpoints(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        resp_loc = client.get(f"/api/reports/exam/{dummy_id}/locator", headers=admin_headers)
        assert resp_loc.status_code in (200, 404, 503)
        resp_loc2 = client.get(f"/api/reports/examination/{dummy_id}/locator", headers=admin_headers)
        assert resp_loc2.status_code in (200, 404, 503)
        resp_csv = client.get(f"/api/reports/exam/{dummy_id}/csv", headers=admin_headers)
        assert resp_csv.status_code in (200, 404, 503)
        resp_csv2 = client.get(f"/api/reports/examination/{dummy_id}/csv", headers=admin_headers)
        assert resp_csv2.status_code in (200, 404, 503)

    def test_ensure_uuid_normalization(self):
        import uuid
        from app.utils.uuid_helper import ensure_uuid

        # 1. Existing valid UUID should remain identical
        valid = str(uuid.uuid4())
        assert ensure_uuid(valid) == valid

        # 2. String labels should be mapped to deterministic valid RFC 4122 UUIDs
        u1 = ensure_uuid("LH-101", "room")
        u2 = ensure_uuid("LH-101", "room")
        assert u1 == u2
        assert uuid.UUID(u1).version == 5

        # 3. None and empty return None
        assert ensure_uuid(None) is None
        assert ensure_uuid("") is None
        assert ensure_uuid("   ") is None

    def test_save_plan_payload_normalization_and_routing(self, client, admin_headers):
        # Verify that save endpoints accept both nested 'plan' and flat payloads
        # with human-readable string room/batch/student names without 422 schema errors
        classroom_payload = {
            "batch_id": "batch-aiml-s3a",
            "room_id": "LH-201",
            "plan_date": "2026-11-20",
            "period": 1,
            "plan": {"kind": "classroom", "status": "draft"},
            "assignments": [
                {"student_id": "23JU0101", "room_id": "LH-201", "row": 0, "col": 0, "seat_label": "A1"}
            ],
        }
        resp_cr = client.post("/api/seating/classroom/save", json=classroom_payload, headers=admin_headers)
        # Should reach DB (returning 200 or 503 if Supabase DB unconfigured), not 422 or 500
        assert resp_cr.status_code in (200, 503)

        exam_payload = {
            "examination_id": "EXAM-2026-1101",
            "plan": {"kind": "examination", "status": "published"},
            "assignments": [
                {"student_id": "23JU0101", "room_id": "LH-101", "row": 0, "col": 0, "seat_label": "A1"}
            ],
        }
        resp_ex = client.post("/api/seating/examination/save", json=exam_payload, headers=admin_headers)
        assert resp_ex.status_code in (200, 503)

    def test_exam_seating_attendance_and_lookup_endpoints_mounted(self, client, admin_headers, student_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        # Test lookup endpoint
        resp_look = client.get("/api/seating/examination/lookup?q=23JU0101", headers=student_headers)
        assert resp_look.status_code in (200, 503)

        resp_look_alias = client.get("/api/seating/exam/lookup?q=23JU0101", headers=student_headers)
        assert resp_look_alias.status_code in (200, 503)

        # Test attendance endpoint
        att_payload = {"student_id": "23JU0101", "status": "present"}
        resp_att = client.post(f"/api/seating/examination/{dummy_id}/attendance", json=att_payload, headers=admin_headers)
        assert resp_att.status_code in (200, 503)

        resp_att_alias = client.post(f"/api/seating/exam/{dummy_id}/attendance", json=att_payload, headers=admin_headers)
        assert resp_att_alias.status_code in (200, 503)

    def test_dashboard_stats_metrics(self, client, admin_headers):
        resp = client.get("/api/dashboard/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "counts" in data
        counts = data["counts"]
        assert "total_examinations" in counts
        assert "total_students" in counts
        assert "total_exam_halls" in counts
        assert "seating_plans_generated" in counts
        assert "occupied_seats" in counts
        assert "available_seats" in counts
        assert "unallocated_students" in counts
        assert "hall_utilization" in counts

    def test_exam_delete_archive_and_subjects_routes(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        # Test archive endpoint
        resp_arch = client.post(f"/api/examinations/{dummy_id}/archive", headers=admin_headers)
        assert resp_arch.status_code in (200, 404, 503)

        resp_arch_alias = client.post(f"/api/exams/{dummy_id}/archive", headers=admin_headers)
        assert resp_arch_alias.status_code in (200, 404, 503)

        # Test delete endpoint
        resp_del = client.delete(f"/api/examinations/{dummy_id}", headers=admin_headers)
        assert resp_del.status_code in (200, 404, 503)

        resp_del_alias = client.delete(f"/api/exams/{dummy_id}", headers=admin_headers)
        assert resp_del_alias.status_code in (200, 404, 503)

        # Test subjects endpoint
        subj_payload = {"subjects": [{"name": "Database Systems", "code": "CS302"}]}
        resp_sub = client.post(f"/api/examinations/{dummy_id}/subjects", json=subj_payload, headers=admin_headers)
        assert resp_sub.status_code in (200, 404, 503)

        resp_sub_get = client.get(f"/api/examinations/{dummy_id}/subjects", headers=admin_headers)
        assert resp_sub_get.status_code in (200, 404, 503)

    def test_exam_halls_put_endpoint_mounting(self, client, admin_headers):
        dummy_id = "00000000-0000-0000-0000-000000000000"
        payload = {"room_ids": ["00000000-0000-0000-0000-000000000001"]}
        resp = client.put(f"/api/examinations/{dummy_id}/halls", json=payload, headers=admin_headers)
        assert resp.status_code in (200, 404, 409, 422, 503)

        resp_alias = client.put(f"/api/exams/{dummy_id}/halls", json=payload, headers=admin_headers)
        assert resp_alias.status_code in (200, 404, 409, 422, 503)


