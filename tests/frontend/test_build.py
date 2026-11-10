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


def test_all_13_navigation_pages_exist():
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
        "MathAnalysisPage.tsx",
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


def test_all_22_frontend_pages_exist():
    pages_dir = Path(__file__).resolve().parents[2] / "frontend" / "src" / "pages"
    all_22_pages = [
        "LandingPage.tsx",
        "LoginPage.tsx",
        "DashboardPage.tsx",
        "ExamDashboardPage.tsx",
        "FacultyDashboardPage.tsx",
        "StudentDashboardPage.tsx",
        "UserManagementPage.tsx",
        "AuditLogsPage.tsx",
        "UniversityPage.tsx",
        "TimetablePage.tsx",
        "StudentPage.tsx",
        "FacultyPage.tsx",
        "RoomsPage.tsx",
        "ClassroomSeatingPage.tsx",
        "ExaminationsPage.tsx",
        "ExamManagementPage.tsx",
        "ExamSeatingPage.tsx",
        "MathAnalysisPage.tsx",
        "ReportsPage.tsx",
        "HistoryPage.tsx",
        "SettingsPage.tsx",
        "StudentSeatLookupPage.tsx",
    ]
    for page_name in all_22_pages:
        assert (pages_dir / page_name).exists(), f"Missing required application page: {page_name}"

