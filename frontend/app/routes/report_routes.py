"""Routes: PDF, CSV, and formatted reports for Classroom & Examination Seating."""

from __future__ import annotations

import csv
import io
from datetime import datetime
from fastapi import APIRouter, Depends, Query, Response
from fastapi.responses import StreamingResponse

from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from ..auth import AuthContext, require_authenticated
from ..database.client import require_db
from ..utils.errors import ApiError

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/plan/{plan_id}/csv")
def export_plan_csv(plan_id: str, auth: AuthContext = Depends(require_authenticated)):
    """Export seating assignments of a plan to CSV."""
    db = require_db()
    plan = (
        db.table("seating_plans")
        .select("*,examinations(name,exam_date,session),batches(semester,section,programs(code)),rooms(name)")
        .eq("id", plan_id)
        .single()
        .execute()
        .data
    )
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")

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

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Plan ID", "Kind", "Examination/Session", "Hall Name", "Seat Label",
        "Row", "Column", "Student Roll No", "Student Name", "Program", "Semester", "Section"
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
        ])

    output.seek(0)
    filename = f"seatwise_plan_{plan_id[:8]}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/plan/{plan_id}/pdf")
def export_plan_pdf(plan_id: str, auth: AuthContext = Depends(require_authenticated)):
    """Generate high-quality printable PDF seating report."""
    db = require_db()
    plan = (
        db.table("seating_plans")
        .select("*,examinations(name,exam_date,session),batches(semester,section,programs(code)),rooms(name)")
        .eq("id", plan_id)
        .single()
        .execute()
        .data
    )
    if not plan:
        raise ApiError(404, "not_found", "Seating plan not found.")

    assignments = (
        db.table("seat_assignments")
        .select("*,students(full_name,roll_number,semester,section,programs(code)),rooms(name)")
        .eq("seating_plan_id", plan_id)
        .order("seat_label")
        .execute()
        .data
        or []
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=20,
        textColor=colors.HexColor("#1e3a8a"),
    )
    sub_style = ParagraphStyle(
        "SubStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )

    elements = []
    elements.append(Paragraph("JAIN UNIVERSITY - SEATWISE ALLOCATION SYSTEM", title_style))
    elements.append(Spacer(1, 4))

    plan_kind = (plan.get("kind") or "seating").upper()
    title_text = f"<b>Plan Kind:</b> {plan_kind} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Status:</b> {plan.get('status','').upper()} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Validation:</b> {plan.get('validation_status','').upper()}"
    if plan.get("kind") == "examination" and plan.get("examinations"):
        e = plan["examinations"]
        title_text += f"<br/><b>Examination:</b> {e.get('name')} | Date: {e.get('exam_date')} ({e.get('session')})"
    elif plan.get("batches"):
        b = plan["batches"]
        prog = (b.get("programs") or {}).get("code", "")
        title_text += f"<br/><b>Class Batch:</b> {prog} Sem {b.get('semester')}-{b.get('section')} | Room: {(plan.get('rooms') or {}).get('name')}"

    title_text += f"<br/><b>Generated:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} &nbsp;&nbsp;|&nbsp;&nbsp; <b>Total Allocated:</b> {len(assignments)}"
    elements.append(Paragraph(title_text, sub_style))
    elements.append(Spacer(1, 14))

    # Table of seats
    table_data = [["Seat", "Roll No", "Student Name", "Program", "Batch", "Hall", "Signature"]]
    for a in assignments:
        st = a.get("students") or {}
        prog = (st.get("programs") or {}).get("code", "")
        sem = st.get("semester", "")
        sec = st.get("section", "")
        batch_str = f"{prog} S{sem}-{sec}" if prog else ""
        hall = (a.get("rooms") or {}).get("name", "")
        table_data.append([
            a.get("seat_label", ""),
            st.get("roll_number", ""),
            st.get("full_name", "")[:24],
            prog,
            batch_str,
            hall,
            "",
        ])

    col_widths = [50, 80, 150, 70, 70, 60, 60]
    t = Table(table_data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a8a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t)

    doc.build(elements)
    buffer.seek(0)
    filename = f"seatwise_report_{plan_id[:8]}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/examination/{exam_id}/locator-pdf")
@router.get("/examination/{exam_id}/locator/pdf")
@router.get("/exam/{exam_id}/locator/pdf")
@router.get("/exam/{exam_id}/locator-pdf")
def export_locator_pdf(exam_id: str, auth: AuthContext = Depends(require_authenticated)):
    """Generate student seat locator notice board list for an examination."""
    db = require_db()
    exam = db.table("examinations").select("*").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    plans = db.table("seating_plans").select("id").eq("examination_id", exam_id).execute().data or []
    plan_ids = [p["id"] for p in plans]
    if not plan_ids:
        raise ApiError(404, "no_plans", "No seating plans generated for this examination.")

    assignments = (
        db.table("seat_assignments")
        .select("seat_label,row,col,students(full_name,roll_number,programs(code)),rooms(name)")
        .in_("seating_plan_id", plan_ids)
        .order("seat_label")
        .execute()
        .data
        or []
    )
    # Sort by Roll Number for easy student lookup on notice board
    assignments.sort(key=lambda x: (x.get("students") or {}).get("roll_number", ""))

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "TitleStyle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=15,
        textColor=colors.HexColor("#1e3a8a"),
    )
    sub_style = ParagraphStyle(
        "SubStyle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        textColor=colors.HexColor("#475569"),
    )

    elements = []
    elements.append(Paragraph("JAIN UNIVERSITY - STUDENT EXAMINATION SEAT LOCATOR", title_style))
    elements.append(Paragraph(
        f"<b>Examination:</b> {exam.get('name')} &nbsp;|&nbsp; <b>Date:</b> {exam.get('exam_date')} &nbsp;|&nbsp; <b>Session:</b> {exam.get('session')}<br/>"
        f"<b>Notice:</b> Students must locate their registered Roll Number below and proceed directly to the designated Hall and Seat.",
        sub_style,
    ))
    elements.append(Spacer(1, 12))

    table_data = [["Roll Number", "Student Name", "Program", "Examination Hall", "Allocated Seat"]]
    for a in assignments:
        st = a.get("students") or {}
        prog = (st.get("programs") or {}).get("code", "")
        hall = (a.get("rooms") or {}).get("name", "")
        table_data.append([
            st.get("roll_number", ""),
            st.get("full_name", "")[:28],
            prog,
            hall,
            a.get("seat_label", ""),
        ])

    t = Table(table_data, colWidths=[100, 170, 80, 110, 80], repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
    ]))
    elements.append(t)

    doc.build(elements)
    buffer.seek(0)
    filename = f"seat_locator_{exam_id[:8]}.pdf"
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/examination/{exam_id}/locator")
@router.get("/exam/{exam_id}/locator")
def get_locator_data(exam_id: str, auth: AuthContext = Depends(require_authenticated)):
    """Return JSON locator records for student lookup in the UI."""
    db = require_db()
    exam = db.table("examinations").select("*").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    plans = db.table("seating_plans").select("id").eq("examination_id", exam_id).execute().data or []
    plan_ids = [p["id"] for p in plans]
    if not plan_ids:
        return {"exam": exam, "locators": []}

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
    locators = [
        {
            "roll": (a.get("students") or {}).get("roll_number", ""),
            "name": (a.get("students") or {}).get("full_name", ""),
            "exam": exam.get("name", ""),
            "session": "Morning" if exam.get("session") == "FN" else "Afternoon",
            "hall": (a.get("rooms") or {}).get("name", "Exam Hall"),
            "seat": a.get("seat_label", ""),
            "batch": ((a.get("students") or {}).get("programs") or {}).get("code", "Core"),
        }
        for a in assignments
    ]
    return {"exam": exam, "locators": locators}


@router.get("/examination/{exam_id}/csv")
@router.get("/exam/{exam_id}/csv")
def export_exam_csv(exam_id: str, auth: AuthContext = Depends(require_authenticated)):
    """Export examination seating plan to CSV."""
    db = require_db()
    exam = db.table("examinations").select("*").eq("id", exam_id).single().execute().data
    if not exam:
        raise ApiError(404, "not_found", "Examination not found.")

    plans = db.table("seating_plans").select("id").eq("examination_id", exam_id).execute().data or []
    plan_ids = [p["id"] for p in plans]
    assignments = []
    if plan_ids:
        assignments = (
            db.table("seat_assignments")
            .select("seat_label,row,col,students(full_name,roll_number,semester,section,programs(code)),rooms(name)")
            .in_("seating_plan_id", plan_ids)
            .order("seat_label")
            .execute()
            .data
            or []
        )
    assignments.sort(key=lambda x: (x.get("students") or {}).get("roll_number", ""))

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Roll Number", "Candidate Name", "Examination", "Session", "Hall Name", "Seat Label", "Batch"])
    for a in assignments:
        st = a.get("students") or {}
        hall = (a.get("rooms") or {}).get("name", "")
        prog = (st.get("programs") or {}).get("code", "")
        writer.writerow([
            st.get("roll_number", ""),
            st.get("full_name", ""),
            exam.get("name", ""),
            exam.get("session", ""),
            hall,
            a.get("seat_label", ""),
            f"{prog}-S{st.get('semester', '')}{st.get('section', '')}",
        ])

    output.seek(0)
    filename = f"seatwise_exam_{exam_id[:8]}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
