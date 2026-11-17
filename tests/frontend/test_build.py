"""Frontend build and asset integrity tests."""

from pathlib import Path


def test_frontend_dist_built():
    dist_dir = Path(__file__).resolve().parents[2] / "frontend" / "dist"
    assert dist_dir.exists(), "frontend/dist does not exist"
    index_html = dist_dir / "index.html"
    assert index_html.exists(), "frontend/dist/index.html does not exist"
    assets_dir = dist_dir / "assets"
    assert assets_dir.exists(), "frontend/dist/assets does not exist"
    js_files = list(assets_dir.glob("*.js"))
    assert len(js_files) > 0, "No JS bundle produced in frontend/dist/assets"
    css_files = list(assets_dir.glob("*.css"))
    assert len(css_files) > 0, "No CSS bundle produced in frontend/dist/assets"


def test_all_12_navigation_pages_exist():
    pages_dir = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"
    required_pages = [
        "DashboardPage.tsx",
        "UniversityPage.tsx",
        "TimetablePage.tsx",
        "StudentPage.tsx",
        "FacultyPage.tsx",
        "RoomsPage.tsx",
        "ClassroomSeatingPage.tsx",
        "ExaminationsPage.tsx",
        "ExamSeatingPage.tsx",
        "ReportsPage.tsx",
        "HistoryPage.tsx",
        "SettingsPage.tsx",
    ]
    for p in required_pages:
        assert (pages_dir / p).exists(), f"Missing required page: {p}"


def test_frontend_api_service_endpoints():
    api_ts = Path(__file__).resolve().parents[2] / "frontend" / "src" / "services" / "api.ts"
    assert api_ts.exists(), "frontend/src/services/api.ts missing"
    content = api_ts.read_text(encoding="utf-8")
    expected_methods = [
        "getDashboardStats",
        "getPrograms",
        "getProgramTree",
        "getBatches",
        "createProgram",
        "createBatch",
        "getTimetable",
        "previewTimetable",
        "confirmTimetableImport",
        "searchTimetable",
        "getStudents",
        "createStudent",
        "importStudents",
        "getFaculty",
        "createFaculty",
        "getRooms",
        "getApprovedExamHalls",
        "createRoom",
        "updateRoomLayout",
        "generateClassroomSeating",
        "saveClassroomSeating",
        "getClassroomPlan",
        "updateAttendance",
        "getExams",
        "getExam",
        "createExam",
        "generateExamSeating",
        "validateExamAllocation",
        "saveExamSeating",
        "getExamPlan",
        "publishExamPlan",
        "getSeatingPlans",
        "getExamLocatorData",
        "getPlanCsvUrl",
        "getPlanPdfUrl",
        "getExamLocatorPdfUrl",
        "getExamCsvUrl",
        "mathCapacity",
        "mathCheckerboard",
        "mathSolve",
    ]
    for method in expected_methods:
        assert method in content, f"api.ts missing required client method: {method}"


def test_frontend_page_contracts():
    pages_dir = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"
    for page in pages_dir.glob("*.tsx"):
        txt = page.read_text(encoding="utf-8")
        # Ensure export exists
        assert "export const" in txt or "export default" in txt, f"Page {page.name} has no export"
        # Ensure React components are balanced
        assert txt.count("{") == txt.count("}"), f"Unbalanced braces in {page.name}"


def test_all_20_frontend_pages_exist():
    pages_dir = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"
    all_20_pages = [
        "LandingPage.tsx",
        "LoginPage.tsx",
        "DashboardPage.tsx",
        "ExamDashboardPage.tsx",
        "FacultyDashboardPage.tsx",
        "StudentDashboardPage.tsx",
        "UserManagementPage.tsx",
        "UniversityPage.tsx",
        "TimetablePage.tsx",
        "StudentPage.tsx",
        "FacultyPage.tsx",
        "RoomsPage.tsx",
        "ClassroomSeatingPage.tsx",
        "ExaminationsPage.tsx",
        "ExamManagementPage.tsx",
        "ExamSeatingPage.tsx",
        "ReportsPage.tsx",
        "HistoryPage.tsx",
        "SettingsPage.tsx",
        "StudentSeatLookupPage.tsx",
    ]
    for page_name in all_20_pages:
        assert (pages_dir / page_name).exists(), f"Missing required application page: {page_name}"


def test_institutional_logo_assets_exist():
    root = Path(__file__).resolve().parents[2]
    public_dir = root / "frontend" / "public"
    src_assets_dir = root / "frontend" / "src" / "assets"
    
    assert (public_dir / "jain-logo.png").exists(), "frontend/public/jain-logo.png missing"
    assert (public_dir / "jain-logo.jpg").exists(), "frontend/public/jain-logo.jpg missing"
    assert (public_dir / "jain-logo-transparent.png").exists(), "frontend/public/jain-logo-transparent.png missing"
    assert (src_assets_dir / "jain-logo.png").exists(), "frontend/src/assets/jain-logo.png missing"
    assert (src_assets_dir / "jain-logo.jpg").exists(), "frontend/src/assets/jain-logo.jpg missing"
    assert (src_assets_dir / "index.ts").exists(), "frontend/src/assets/index.ts missing"


def test_institutional_logo_html_favicon():
    root = Path(__file__).resolve().parents[2]
    index_html = root / "frontend" / "index.html"
    assert index_html.exists(), "frontend/index.html missing"
    content = index_html.read_text(encoding="utf-8")
    assert "/jain-logo.png" in content, "frontend/index.html does not link /jain-logo.png icon"


def test_backend_frontend_app_source_parity():
    import hashlib
    root = Path(__file__).resolve().parents[2]
    b_dir = root / "backend" / "app"
    f_dir = root / "frontend" / "app"
    
    assert b_dir.exists(), "backend/app does not exist"
    assert f_dir.exists(), "frontend/app does not exist"

    b_files = {p.relative_to(b_dir): p for p in b_dir.rglob("*.py") if "__pycache__" not in p.parts}
    f_files = {p.relative_to(f_dir): p for p in f_dir.rglob("*.py") if "__pycache__" not in p.parts}

    assert len(b_files) > 0, "No python files found in backend/app"
    assert set(b_files.keys()) == set(f_files.keys()), f"File set mismatch: {set(b_files.keys()) ^ set(f_files.keys())}"

    for rel_path, b_path in b_files.items():
        f_path = f_files[rel_path]
        b_hash = hashlib.sha256(b_path.read_bytes()).hexdigest()
        f_hash = hashlib.sha256(f_path.read_bytes()).hexdigest()
        assert b_hash == f_hash, f"SHA-256 hash mismatch for {rel_path}: {b_hash} != {f_hash}"


