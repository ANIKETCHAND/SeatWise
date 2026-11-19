"""Routes: PDF, CSV, and formatted institutional reports for Classroom & Examination Seating."""

from __future__ import annotations

import csv
import io
import re
from datetime import datetime
from typing import Any
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    PageBreak,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

from ..auth import AuthContext, require_staff_or_faculty
from ..database.client import require_db
from ..utils.errors import ApiError
from ..utils.uuid_helper import resolve_exam_id

router = APIRouter(prefix="/reports", tags=["reports"])


class NumberedCanvas(canvas.Canvas):
    """Two-pass ReportLab canvas that stamps running footer and Page X of Y on every page."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count: int):
        self.saveState()
        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 32, self._pagesize[0] - 36, 32)

        # Left institutional footer
        self.drawString(36, 20, "SeatWise Smart Seating System — Jain (Deemed-to-be University) FET Campus")
        # Right page numbering & official university classification (avoids text collision)
        self.drawRightString(
            self._pagesize[0] - 36,
            20,
            f"OFFICIAL UNIVERSITY EXAMINATION RECORD  •  Page {self._pageNumber} of {page_count}",
        )
        self.restoreState()


def make_canonical_filename(
    doc_type: str,
    exam_name: str,
    date: str | None = None,
    session: str | None = None,
    hall_name: str | None = None,
    ext: str = "pdf",
) -> str:
    """Generate standardized institutional filename for university document archival."""
    clean_exam = re.sub(r"[^a-zA-Z0-9_-]", "_", exam_name or "EXAM").strip("_")
    date_str = date or datetime.now().strftime("%Y-%m-%d")
    sess_str = (session or "FN").upper()
    parts = ["JAIN_FET", doc_type, clean_exam]
    if hall_name:
        clean_hall = re.sub(r"[^a-zA-Z0-9_-]", "_", hall_name).strip("_")
        parts.append(clean_hall)
    parts.append(date_str)
    if sess_str:
        parts.append(sess_str)
    return f"{'_'.join(parts)}.{ext}"


def get_report_styles() -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "uni_title": ParagraphStyle("UniTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=15, textColor=colors.HexColor("#0f172a"), alignment=1),
        "uni_sub": ParagraphStyle("UniSub", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor("#1d4ed8"), alignment=1),
        "uni_dept": ParagraphStyle("UniDept", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#475569"), alignment=1),
        "doc_title": ParagraphStyle("DocTitle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=10.5, leading=13, textColor=colors.HexColor("#0f172a"), alignment=1),
        "meta_lbl": ParagraphStyle("MetaLbl", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.HexColor("#64748b")),
        "meta_val": ParagraphStyle("MetaVal", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor("#0f172a")),
        "notice_style": ParagraphStyle("NoticeStyle", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=colors.HexColor("#334155")),
        "th_style": ParagraphStyle("THStyle", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.whitesmoke, alignment=0),
        "th_center": ParagraphStyle("THCenter", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.whitesmoke, alignment=1),
        "cell_style": ParagraphStyle("CellStyle", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#0f172a")),
        "cell_bold": ParagraphStyle("CellBold", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8, leading=10, textColor=colors.HexColor("#0f172a")),
        "cell_center": ParagraphStyle("CellCenter", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#334155"), alignment=1),
        "cell_seat": ParagraphStyle("CellSeat", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=11, textColor=colors.HexColor("#0f172a"), alignment=1),
        "sign_lbl": ParagraphStyle("SignLbl", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9.5, textColor=colors.HexColor("#334155"), alignment=1),
    }


def build_institutional_header(
    elements: list[Any],
    st: dict[str, ParagraphStyle],
    doc_title_text: str,
    exam_name: str,
    date_str: str,
    session_str: str,
    total_count: int,
    venue_str: str,
    notice_text: str | None = None,
):
    elements.append(Paragraph("JAIN (DEEMED-TO-BE UNIVERSITY)", st["uni_title"]))
    elements.append(Paragraph("FACULTY OF ENGINEERING &amp; TECHNOLOGY (FET)", st["uni_sub"]))
    elements.append(Paragraph("OFFICE OF THE CONTROLLER OF EXAMINATIONS", st["uni_dept"]))
    elements.append(Spacer(1, 4))

    accent_bar = Table([[""]], colWidths=[540], rowHeights=[2.5])
    accent_bar.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#1e40af"))]))
    elements.append(accent_bar)
    elements.append(Spacer(1, 6))

    elements.append(Paragraph(doc_title_text, st["doc_title"]))
    elements.append(Spacer(1, 8))

    meta_data = [
        [
            Paragraph("EXAMINATION", st["meta_lbl"]),
            Paragraph("DATE &amp; SESSION", st["meta_lbl"]),
            Paragraph("TOTAL CANDIDATES", st["meta_lbl"]),
            Paragraph("CAMPUS &amp; VENUE", st["meta_lbl"]),
        ],
        [
            Paragraph(exam_name[:36], st["meta_val"]),
            Paragraph(f"{date_str} | {session_str}", st["meta_val"]),
            Paragraph(f"{total_count} Candidates Assigned", st["meta_val"]),
            Paragraph(venue_str[:36], st["meta_val"]),
        ],
    ]
    meta_tbl = Table(meta_data, colWidths=[140, 140, 120, 140])
    meta_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(meta_tbl)
    elements.append(Spacer(1, 6))

    if notice_text:
        n_p = Paragraph(f"<b>Notice to Candidates:</b> {notice_text}", st["notice_style"])
        n_tbl = Table([[n_p]], colWidths=[540])
        n_tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#eff6ff")),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#bfdbfe")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ]))
        elements.append(n_tbl)
        elements.append(Spacer(1, 8))


def build_signoff_block(st: dict[str, ParagraphStyle], note: str = "") -> KeepTogether:
    row1 = [Paragraph(note, st["meta_val"]), Paragraph("", st["meta_val"]), Paragraph("", st["meta_val"])]
    row2 = [Spacer(1, 22), Spacer(1, 22), Spacer(1, 22)]
    row3 = [
        Paragraph("_______________________________<br/>Room Invigilator / Seating Officer", st["sign_lbl"]),
        Paragraph("_______________________________<br/>Chief Superintendent of Exams", st["sign_lbl"]),
        Paragraph("_______________________________<br/>Controller of Examinations", st["sign_lbl"]),
    ]
    t = Table([row1, row2, row3], colWidths=[180, 180, 180])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("SPAN", (0, 0), (2, 0)),
    ]))
    return KeepTogether(t)


# --------------------------------------------------------------------------
# 1. Plan CSV & PDF Exports
# --------------------------------------------------------------------------

@router.get("/plan/{plan_id}/csv")
def export_plan_csv(plan_id: str, auth: AuthContext = Depends(require_staff_or_faculty)):
    """Export seating assignments of a specific plan to CSV with canonical naming."""
    db = require_db()
    plan_rows = []
    try:
        plan_rows = (
            db.table("seating_plans")
            .select("*,examinations(name,exam_date,session),batches(semester,section,programs(code)),rooms(name)")
            .eq("id", plan_id)
            .execute()
            .data
            or []
        )
    except Exception:
        pass
    if not plan_rows:
        raise ApiError(404, "not_found", "Seating plan not found.")
    plan = plan_rows[0]

    assignments = []
    try:
        assignments = (
            db.table("seat_assignments")
            .select("*,students(full_name,roll_number,semester,section,programs(code)),rooms(name)")
            .eq("seating_plan_id", plan_id)
            .order("room_id")
            .order("row")
            .order("col")
            .execute()
            .data
            or []
        )
    except Exception:
        assignments = []

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Institution", "Campus", "Plan ID", "Kind", "Examination/Session", "Hall Name",
        "Desk Label", "Row", "Column", "Student Roll No", "Student Name", "Program", "Semester", "Section", "Status"
    ])

    exam_title = ""
    if plan.get("kind") == "examination" and plan.get("examinations"):
        exam_title = f"{plan['examinations']['name']} ({plan['examinations']['exam_date']} - {plan['examinations']['session']})"
    elif plan.get("batches"):
        b = plan["batches"]
        prog = (b.get("programs") or {}).get("code", "")
        exam_title = f"Classroom {prog} S{b.get('semester')}-{b.get('section')}"

    for a in assignments:
        st = a.get("students") or {}
        prog = (st.get("programs") or {}).get("code", "")
        hall = (a.get("rooms") or {}).get("name", "")
        writer.writerow([
            "Jain (Deemed-to-be University)",
            "Faculty of Engineering and Technology (FET)",
            plan_id,
            plan.get("kind"),
            exam_title,
            hall,
            a.get("seat_label"),
            a.get("row"),
            a.get("col"),
            st.get("roll_number", ""),
            st.get("full_name", ""),
            prog,
            st.get("semester", ""),
            st.get("section", ""),
            plan.get("status", "allocated"),
        ])

    output.seek(0)
    filename = f"JAIN_FET_Seating_Plan_{plan_id[:8]}_{datetime.now().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/plan/{plan_id}/pdf")
def export_plan_pdf(plan_id: str, auth: AuthContext = Depends(require_staff_or_faculty)):
    """Generate high-quality printable PDF seating report with zero text overlap."""
    db = require_db()
    plan_rows = []
    try:
        plan_rows = (
            db.table("seating_plans")
            .select("*,examinations(name,exam_date,session),batches(semester,section,programs(code)),rooms(name)")
            .eq("id", plan_id)
            .execute()
            .data
            or []
        )
    except Exception:
        pass
    if not plan_rows:
        raise ApiError(404, "not_found", "Seating plan not found.")
    plan = plan_rows[0]

    assignments = []
    try:
        assignments = (
            db.table("seat_assignments")
            .select("*,students(full_name,roll_number,semester,section,programs(code)),rooms(name)")
            .eq("seating_plan_id", plan_id)
            .order("seat_label")
            .execute()
            .data
            or []
        )
    except Exception:
        assignments = []

    st_styles = get_report_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=46)

    elements: list[Any] = []
    plan_kind = (plan.get("kind") or "seating").upper()
    exam_info = plan.get("examinations") or {}
    exam_name = exam_info.get("name") or f"Seating Allocation ({plan_kind})"
    exam_date = exam_info.get("exam_date") or datetime.now().strftime("%Y-%m-%d")
    exam_session = exam_info.get("session") or "FN"
    venue_str = (plan.get("rooms") or {}).get("name") or "FET Examination Halls"

    build_institutional_header(
        elements,
        st_styles,
        doc_title_text=f"SEATING ARRANGEMENT REPORT — {plan_kind}",
        exam_name=exam_name,
        date_str=exam_date,
        session_str=exam_session,
        total_count=len(assignments),
        venue_str=venue_str,
        notice_text="Official allocation generated and verified by the SeatWise algorithmic seating engine.",
    )

    table_data = [[
        Paragraph("Desk", st_styles["th_center"]),
        Paragraph("Roll Number", st_styles["th_style"]),
        Paragraph("Candidate Name", st_styles["th_style"]),
        Paragraph("Program", st_styles["th_center"]),
        Paragraph("Hall Name", st_styles["th_style"]),
        Paragraph("Signature", st_styles["th_center"]),
    ]]

    for a in assignments:
        st = a.get("students") or {}
        prog = (st.get("programs") or {}).get("code", "")
        hall = (a.get("rooms") or {}).get("name", "")
        table_data.append([
            Paragraph(a.get("seat_label", ""), st_styles["cell_seat"]),
            Paragraph(st.get("roll_number", ""), st_styles["cell_bold"]),
            Paragraph(st.get("full_name", ""), st_styles["cell_style"]),
            Paragraph(prog, st_styles["cell_center"]),
            Paragraph(hall, st_styles["cell_style"]),
            Paragraph("_______________", st_styles["cell_center"]),
        ])

    t = Table(table_data, colWidths=[50, 115, 145, 70, 100, 60], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 14))
    elements.append(build_signoff_block(st_styles, f"Total Seated: {len(assignments)} &nbsp;|&nbsp; Validation: {plan.get('validation_status', 'VALID').upper()}"))

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    filename = make_canonical_filename("Plan_Report", exam_name, exam_date, exam_session)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------------
# 2. Student Seat Locator (Notice Board Notice) PDF
# --------------------------------------------------------------------------

@router.get("/examination/{exam_id}/locator-pdf")
@router.get("/examination/{exam_id}/locator/pdf")
@router.get("/exam/{exam_id}/locator/pdf")
@router.get("/exam/{exam_id}/locator-pdf")
def export_locator_pdf(exam_id: str, auth: AuthContext = Depends(require_staff_or_faculty)):
    """Generate student seat locator notice board list for an examination."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    exam_rows = []
    try:
        exam_rows = db.table("examinations").select("*").eq("id", real_exam_id).execute().data or []
    except Exception:
        pass

    if not exam_rows:
        try:
            exam_rows = db.table("examinations").select("*").ilike("name", f"%{exam_id}%").limit(1).execute().data or []
        except Exception:
            pass

    exam = exam_rows[0] if exam_rows else {
        "id": real_exam_id,
        "name": f"Examination ({exam_id[:8] if len(exam_id) >= 8 else exam_id})",
        "exam_date": datetime.now().strftime("%Y-%m-%d"),
        "session": "FN",
    }

    plans = []
    try:
        plans = db.table("seating_plans").select("id").eq("examination_id", real_exam_id).execute().data or []
    except Exception:
        pass
    plan_ids = [p["id"] for p in plans]

    assignments = []
    if plan_ids:
        try:
            assignments = (
                db.table("seat_assignments")
                .select("seat_label,row,col,students(full_name,roll_number,programs(code)),rooms(name)")
                .in_("seating_plan_id", plan_ids)
                .order("seat_label")
                .execute()
                .data
                or []
            )
            assignments.sort(key=lambda x: (x.get("students") or {}).get("roll_number", ""))
        except Exception:
            assignments = []

    st_styles = get_report_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=46)

    elements: list[Any] = []
    exam_name = exam.get("name") or "Examination"
    exam_date = exam.get("exam_date") or datetime.now().strftime("%Y-%m-%d")
    exam_session = exam.get("session") or "FN"

    # Gather distinct halls
    halls_used = sorted(list({(a.get("rooms") or {}).get("name") for a in assignments if (a.get("rooms") or {}).get("name")}))
    venue_str = ", ".join(halls_used) if halls_used else "FET Examination Halls"

    build_institutional_header(
        elements,
        st_styles,
        doc_title_text="STUDENT EXAMINATION SEAT LOCATOR &amp; NOTICE BOARD CHART",
        exam_name=exam_name,
        date_str=exam_date,
        session_str=exam_session,
        total_count=len(assignments),
        venue_str=venue_str,
        notice_text="Students must locate their registered Roll Number below and proceed directly to their assigned Hall and Desk. Occupy your designated seat at least 15 minutes before the session starts.",
    )

    if not assignments:
        notice_data = [
            [Paragraph("Status Notice", st_styles["th_style"]), Paragraph("Details &amp; Action Required", st_styles["th_style"])],
            [Paragraph("Seating Plan Status", st_styles["cell_bold"]), Paragraph("Draft / In Progress", st_styles["cell_style"])],
            [Paragraph("Notice", st_styles["cell_bold"]), Paragraph(f"No candidate seat assignments have been finalized or saved yet for {exam_name}.", st_styles["cell_style"])],
            [Paragraph("Instructions", st_styles["cell_bold"]), Paragraph("To display candidate seating assignments, generate and save the plan in the Seating Planner, or publish the examination session.", st_styles["cell_style"])],
        ]
        t = Table(notice_data, colWidths=[140, 400])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(t)
    else:
        table_data = [[
            Paragraph("Roll Number", st_styles["th_style"]),
            Paragraph("Student Name", st_styles["th_style"]),
            Paragraph("Program", st_styles["th_center"]),
            Paragraph("Examination Hall", st_styles["th_style"]),
            Paragraph("Allocated Seat", st_styles["th_center"]),
        ]]
        for a in assignments:
            st = a.get("students") or {}
            prog = (st.get("programs") or {}).get("code", "")
            hall = (a.get("rooms") or {}).get("name", "")
            table_data.append([
                Paragraph(st.get("roll_number", ""), st_styles["cell_bold"]),
                Paragraph(st.get("full_name", ""), st_styles["cell_style"]),
                Paragraph(prog, st_styles["cell_center"]),
                Paragraph(hall, st_styles["cell_style"]),
                Paragraph(a.get("seat_label", ""), st_styles["cell_seat"]),
            ])

        # Widths: 130 + 140 + 70 + 140 + 60 = 540 pt (zero clipping, zero overlap)
        t = Table(table_data, colWidths=[130, 140, 70, 140, 60], repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ]))
        elements.append(t)

    elements.append(Spacer(1, 14))
    elements.append(build_signoff_block(st_styles, f"Total Candidates: {len(assignments)} &nbsp;|&nbsp; Verified Official Notice Board Copy"))

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    filename = make_canonical_filename("Seat_Locator", exam_name, exam_date, exam_session)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------------
# 3. Invigilator Attendance & Signature Sheet PDF
# --------------------------------------------------------------------------

@router.get("/examination/{exam_id}/attendance/pdf")
@router.get("/examination/{exam_id}/attendance-pdf")
@router.get("/exam/{exam_id}/attendance/pdf")
@router.get("/exam/{exam_id}/attendance-pdf")
def export_attendance_pdf(
    exam_id: str,
    hall: str | None = Query(None),
    auth: AuthContext = Depends(require_staff_or_faculty),
):
    """Generate official Candidate Attendance & Signature Register PDF for examination invigilators."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    exam_rows = []
    try:
        exam_rows = db.table("examinations").select("*").eq("id", real_exam_id).execute().data or []
    except Exception:
        pass

    exam = exam_rows[0] if exam_rows else {
        "id": real_exam_id,
        "name": f"Examination ({exam_id[:8] if len(exam_id) >= 8 else exam_id})",
        "exam_date": datetime.now().strftime("%Y-%m-%d"),
        "session": "FN",
    }

    plans = []
    try:
        plans = db.table("seating_plans").select("id").eq("examination_id", real_exam_id).execute().data or []
    except Exception:
        pass
    plan_ids = [p["id"] for p in plans]

    assignments = []
    if plan_ids:
        try:
            assignments = (
                db.table("seat_assignments")
                .select("seat_label,row,col,students(full_name,roll_number,programs(code)),rooms(name,code)")
                .in_("seating_plan_id", plan_ids)
                .order("seat_label")
                .execute()
                .data
                or []
            )
        except Exception:
            assignments = []

    # Group assignments by Hall
    by_hall: dict[str, list[dict]] = {}
    for a in assignments:
        r = a.get("rooms") or {}
        h_name = r.get("name") or r.get("code") or "Examination Hall"
        by_hall.setdefault(h_name, []).append(a)

    # If hall query filter provided, filter down
    if hall:
        h_clean = hall.strip().lower()
        filtered = {}
        for k, v in by_hall.items():
            if h_clean in k.lower():
                filtered[k] = v
            else:
                for a in v:
                    r = a.get("rooms") or {}
                    r_code = (r.get("code") or "").lower()
                    r_name = (r.get("name") or "").lower()
                    r_id = str(r.get("id") or "").lower()
                    if h_clean in (r_code, r_name, r_id) or h_clean in r_code or h_clean in r_name:
                        filtered[k] = v
                        break
        if filtered:
            by_hall = filtered

    st_styles = get_report_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=46)

    elements: list[Any] = []
    exam_name = exam.get("name") or "Examination"
    exam_date = exam.get("exam_date") or datetime.now().strftime("%Y-%m-%d")
    exam_session = exam.get("session") or "FN"

    hall_keys = list(by_hall.keys())
    if not hall_keys:
        # Render empty notice
        build_institutional_header(
            elements,
            st_styles,
            doc_title_text="EXAMINATION CANDIDATE ATTENDANCE &amp; SIGNATURE REGISTER",
            exam_name=exam_name,
            date_str=exam_date,
            session_str=exam_session,
            total_count=0,
            venue_str=hall or "FET Examination Halls",
            notice_text="No candidate records found for this examination hall. Please generate seating first.",
        )
        elements.append(Spacer(1, 20))
        elements.append(build_signoff_block(st_styles, "Attendance Register — Pending Seating Allocation"))
    else:
        for idx, h_name in enumerate(hall_keys):
            if idx > 0:
                elements.append(PageBreak())

            hall_candidates = by_hall[h_name]
            # Sort by seat_label inside hall
            hall_candidates.sort(key=lambda x: (x.get("row", 0), x.get("col", 0), x.get("seat_label", "")))

            build_institutional_header(
                elements,
                st_styles,
                doc_title_text="EXAMINATION CANDIDATE ATTENDANCE &amp; SIGNATURE REGISTER",
                exam_name=exam_name,
                date_str=exam_date,
                session_str=exam_session,
                total_count=len(hall_candidates),
                venue_str=f"Venue: {h_name}",
                notice_text="Invigilators must verify candidate identity and ensure physical signatures are placed in the register upon distribution of question papers.",
            )

            att_headers = [
                Paragraph("Desk", st_styles["th_center"]),
                Paragraph("Roll Number", st_styles["th_style"]),
                Paragraph("Candidate Name", st_styles["th_style"]),
                Paragraph("Program", st_styles["th_center"]),
                Paragraph("Attendance Status", st_styles["th_center"]),
                Paragraph("Student Signature", st_styles["th_center"]),
            ]
            att_rows = [att_headers]

            for a in hall_candidates:
                st = a.get("students") or {}
                prog = (st.get("programs") or {}).get("code", "")
                att_rows.append([
                    Paragraph(a.get("seat_label", ""), st_styles["cell_seat"]),
                    Paragraph(st.get("roll_number", ""), st_styles["cell_bold"]),
                    Paragraph(st.get("full_name", ""), st_styles["cell_style"]),
                    Paragraph(prog, st_styles["cell_center"]),
                    Paragraph("[ &nbsp; ] Present &nbsp; [ &nbsp; ]<br/>Absent", st_styles["cell_center"]),
                    Paragraph("_________________<br/>__", st_styles["cell_center"]),
                ])

            # Widths: 45 + 115 + 130 + 80 + 85 + 85 = 540 pt
            att_tbl = Table(att_rows, colWidths=[45, 115, 130, 80, 85, 85], repeatRows=1)
            att_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]))
            elements.append(att_tbl)
            elements.append(Spacer(1, 10))

            summary_note = f"Hall: {h_name} &nbsp;|&nbsp; Total Registered: {len(hall_candidates)} &nbsp;|&nbsp; Present: _____ &nbsp;|&nbsp; Absent: _____ &nbsp;|&nbsp; Malpractice: _____"
            elements.append(build_signoff_block(st_styles, summary_note))

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    filename = make_canonical_filename("Attendance_Sheet", exam_name, exam_date, exam_session, hall_name=hall)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------------
# 4. Hall Seating Arrangement & Door Display Chart PDF
# --------------------------------------------------------------------------

@router.get("/examination/{exam_id}/hall-chart/pdf")
@router.get("/examination/{exam_id}/hall-chart-pdf")
@router.get("/exam/{exam_id}/hall-chart/pdf")
@router.get("/exam/{exam_id}/hall-chart-pdf")
def export_hall_chart_pdf(
    exam_id: str,
    hall: str | None = Query(None),
    auth: AuthContext = Depends(require_staff_or_faculty),
):
    """Generate Hall Seating Chart / Door Display Notice for paste-up outside exam halls."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    exam_rows = []
    try:
        exam_rows = db.table("examinations").select("*").eq("id", real_exam_id).execute().data or []
    except Exception:
        pass

    exam = exam_rows[0] if exam_rows else {
        "id": real_exam_id,
        "name": f"Examination ({exam_id[:8] if len(exam_id) >= 8 else exam_id})",
        "exam_date": datetime.now().strftime("%Y-%m-%d"),
        "session": "FN",
    }

    plans = []
    try:
        plans = db.table("seating_plans").select("id").eq("examination_id", real_exam_id).execute().data or []
    except Exception:
        pass
    plan_ids = [p["id"] for p in plans]

    assignments = []
    if plan_ids:
        try:
            assignments = (
                db.table("seat_assignments")
                .select("seat_label,row,col,students(full_name,roll_number,programs(code)),rooms(name,code)")
                .in_("seating_plan_id", plan_ids)
                .order("seat_label")
                .execute()
                .data
                or []
            )
        except Exception:
            assignments = []

    by_hall: dict[str, list[dict]] = {}
    for a in assignments:
        r = a.get("rooms") or {}
        h_name = r.get("name") or r.get("code") or "Examination Hall"
        by_hall.setdefault(h_name, []).append(a)

    if hall:
        h_clean = hall.strip().lower()
        filtered = {}
        for k, v in by_hall.items():
            if h_clean in k.lower():
                filtered[k] = v
            else:
                for a in v:
                    r = a.get("rooms") or {}
                    r_code = (r.get("code") or "").lower()
                    r_name = (r.get("name") or "").lower()
                    r_id = str(r.get("id") or "").lower()
                    if h_clean in (r_code, r_name, r_id) or h_clean in r_code or h_clean in r_name:
                        filtered[k] = v
                        break
        if filtered:
            by_hall = filtered

    st_styles = get_report_styles()
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=46)

    elements: list[Any] = []
    exam_name = exam.get("name") or "Examination"
    exam_date = exam.get("exam_date") or datetime.now().strftime("%Y-%m-%d")
    exam_session = exam.get("session") or "FN"

    hall_keys = list(by_hall.keys())
    if not hall_keys:
        build_institutional_header(
            elements,
            st_styles,
            doc_title_text="HALL SEATING ARRANGEMENT &amp; DOOR NOTICE",
            exam_name=exam_name,
            date_str=exam_date,
            session_str=exam_session,
            total_count=0,
            venue_str=hall or "FET Examination Halls",
            notice_text="No candidate seating generated yet for this examination venue.",
        )
    else:
        for idx, h_name in enumerate(hall_keys):
            if idx > 0:
                elements.append(PageBreak())

            hall_candidates = by_hall[h_name]
            hall_candidates.sort(key=lambda x: (x.get("seat_label", "")))

            build_institutional_header(
                elements,
                st_styles,
                doc_title_text="HALL SEATING ARRANGEMENT &amp; DOOR NOTICE",
                exam_name=exam_name,
                date_str=exam_date,
                session_str=exam_session,
                total_count=len(hall_candidates),
                venue_str=f"Venue Hall: {h_name}",
                notice_text=f"Please verify your Roll Number below before entering Hall {h_name}. Occupy the designated desk immediately.",
            )

            # Table: Desk, Roll Number, Student Name, Program
            chart_headers = [
                Paragraph("Desk", st_styles["th_center"]),
                Paragraph("Roll Number", st_styles["th_style"]),
                Paragraph("Candidate Name", st_styles["th_style"]),
                Paragraph("Program / Batch", st_styles["th_center"]),
            ]
            chart_rows = [chart_headers]

            for a in hall_candidates:
                st = a.get("students") or {}
                prog = (st.get("programs") or {}).get("code", "")
                chart_rows.append([
                    Paragraph(a.get("seat_label", ""), st_styles["cell_seat"]),
                    Paragraph(st.get("roll_number", ""), st_styles["cell_bold"]),
                    Paragraph(st.get("full_name", ""), st_styles["cell_style"]),
                    Paragraph(prog, st_styles["cell_center"]),
                ])

            # Widths: 60 + 150 + 210 + 120 = 540 pt
            chart_tbl = Table(chart_rows, colWidths=[60, 150, 210, 120], repeatRows=1)
            chart_tbl.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ]))
            elements.append(chart_tbl)
            elements.append(Spacer(1, 14))
            elements.append(build_signoff_block(st_styles, f"Hall Notice for {h_name} &nbsp;|&nbsp; Capacity Allocated: {len(hall_candidates)} Desks"))

    doc.build(elements, canvasmaker=NumberedCanvas)
    buffer.seek(0)
    filename = make_canonical_filename("Hall_Door_Chart", exam_name, exam_date, exam_session, hall_name=hall)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# --------------------------------------------------------------------------
# 5. Locator JSON Data & Master CSV
# --------------------------------------------------------------------------

@router.get("/examination/{exam_id}/locator")
@router.get("/exam/{exam_id}/locator")
def get_locator_data(exam_id: str, auth: AuthContext = Depends(require_staff_or_faculty)):
    """Return JSON locator records for student lookup in the UI."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    exam_rows = []
    try:
        exam_rows = db.table("examinations").select("*").eq("id", real_exam_id).execute().data or []
    except Exception:
        pass

    exam = exam_rows[0] if exam_rows else {"name": "Examination", "session": "FN", "id": real_exam_id}

    plans = []
    try:
        plans = db.table("seating_plans").select("id").eq("examination_id", real_exam_id).execute().data or []
    except Exception:
        pass
    plan_ids = [p["id"] for p in plans]
    if not plan_ids:
        return {"exam": exam, "locators": []}

    assignments = []
    try:
        assignments = (
            db.table("seat_assignments")
            .select("seat_label,row,col,students(full_name,roll_number,programs(code)),rooms(name,code)")
            .in_("seating_plan_id", plan_ids)
            .order("seat_label")
            .execute()
            .data
            or []
        )
    except Exception:
        assignments = []

    assignments.sort(key=lambda x: (x.get("students") or {}).get("roll_number", ""))
    locators = [
        {
            "roll": (a.get("students") or {}).get("roll_number", ""),
            "name": (a.get("students") or {}).get("full_name", ""),
            "exam": exam.get("name", ""),
            "session": "Morning" if exam.get("session") == "FN" else "Afternoon",
            "hall": (a.get("rooms") or {}).get("code") or (a.get("rooms") or {}).get("name", "Exam Hall"),
            "seat": a.get("seat_label", ""),
            "batch": ((a.get("students") or {}).get("programs") or {}).get("code", "Core"),
        }
        for a in assignments
    ]
    return {"exam": exam, "locators": locators}


@router.get("/examination/{exam_id}/csv")
@router.get("/exam/{exam_id}/csv")
def export_exam_csv(exam_id: str, auth: AuthContext = Depends(require_staff_or_faculty)):
    """Export complete examination seating master plan to CSV with canonical academic filing."""
    db = require_db()
    real_exam_id = resolve_exam_id(db, exam_id) or exam_id
    exam_rows = []
    try:
        exam_rows = db.table("examinations").select("*").eq("id", real_exam_id).execute().data or []
    except Exception:
        pass

    exam = exam_rows[0] if exam_rows else {
        "id": real_exam_id,
        "name": f"Exam_{exam_id[:8]}",
        "exam_date": datetime.now().strftime("%Y-%m-%d"),
        "session": "FN",
    }

    plans = []
    try:
        plans = db.table("seating_plans").select("id").eq("examination_id", real_exam_id).execute().data or []
    except Exception:
        pass
    plan_ids = [p["id"] for p in plans]

    assignments = []
    if plan_ids:
        try:
            assignments = (
                db.table("seat_assignments")
                .select("seat_label,row,col,students(full_name,roll_number,semester,section,programs(code)),rooms(name,code)")
                .in_("seating_plan_id", plan_ids)
                .order("seat_label")
                .execute()
                .data
                or []
            )
        except Exception:
            assignments = []

    assignments.sort(key=lambda x: (x.get("students") or {}).get("roll_number", ""))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Institution", "Campus", "Examination", "Exam_Date", "Session", "Hall_Code", "Hall_Name",
        "Row", "Column", "Desk_Label", "Roll_Number", "Candidate_Name", "Program", "Batch", "Attendance_Status"
    ])

    for a in assignments:
        st = a.get("students") or {}
        rm = a.get("rooms") or {}
        hall_name = rm.get("name", "")
        hall_code = rm.get("code", "")
        prog = (st.get("programs") or {}).get("code", "")
        sem = st.get("semester", "")
        sec = st.get("section", "")
        batch_label = f"{prog}-S{sem}{sec}" if prog else ""
        writer.writerow([
            "Jain (Deemed-to-be University)",
            "Faculty of Engineering and Technology (FET)",
            exam.get("name", ""),
            exam.get("exam_date", ""),
            exam.get("session", ""),
            hall_code,
            hall_name,
            a.get("row", ""),
            a.get("col", ""),
            a.get("seat_label", ""),
            st.get("roll_number", ""),
            st.get("full_name", ""),
            prog,
            batch_label,
            "present",
        ])

    output.seek(0)
    filename = make_canonical_filename(
        "Master_Seating",
        exam.get("name") or "Exam",
        exam.get("exam_date"),
        exam.get("session"),
        ext="csv",
    )
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
