"""Timetable parsing service.

Parses the supplied Jain timetable workbook (see
docs/timetable-data-analysis.md for the verified file structure).

Design rules (from the master specification):
- never invent subjects, faculty, rooms or timings;
- merge multi-period labs (a `lab` row followed by `lab-continue` rows)
  into ONE session;
- report every problem row in the preview; never drop records silently;
- rooms from the teaching timetable are catalogue data only — they are
  NOT approved examination halls.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from io import BytesIO

import openpyxl

DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
VALID_SLOT_TYPES = {"class", "lab", "lab-continue", "activity", "lunch", "free", "sametime"}

SLOT_TYPE_MAP = {
    "class": "class",
    "lab": "lab",
    "lab-continue": "lab_continue",
    "activity": "activity",
    "lunch": "lunch",
    "free": "free",
    "sametime": "sametime",
}

# `SUBJ(CODE) in ROOM` / `SUBJ(CODE)(L) in ROOM` / `ACTIVITY in ROOM`
RE_SLOT_TEXT = re.compile(
    r"^(?P<label>[A-Za-z0-9&\.\-/ ]+?)"
    r"(?:\((?P<code>[A-Z0-9, ]+)\))?"
    r"(?P<lab>\(L\))?"
    r"(?:\s+in\s+(?P<room>.+))?$"
)


@dataclass(slots=True)
class ParsedEntry:
    program: str
    semester: int
    section: str
    day: str
    period_start: int
    period_end: int
    slot_type: str  # mapped enum value
    subject_label: str
    subject_code: str | None
    faculty_name: str | None
    room_name: str | None
    is_multi_period: bool


@dataclass(slots=True)
class ParseReport:
    batches: list[dict] = field(default_factory=list)
    entries: list[ParsedEntry] = field(default_factory=list)
    subjects: list[dict] = field(default_factory=list)
    faculty: list[dict] = field(default_factory=list)
    rooms: list[dict] = field(default_factory=list)
    warnings: list[dict] = field(default_factory=list)
    errors: list[dict] = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    def as_dict(self) -> dict:
        return {
            "batches": self.batches,
            "entries": [e.__dict__ for e in self.entries],
            "subjects": self.subjects,
            "faculty": self.faculty,
            "rooms": self.rooms,
            "warnings": self.warnings,
            "errors": self.errors,
            "stats": self.stats,
        }


def _clean(value) -> str:
    return str(value).strip() if value is not None else ""


def parse_scheduled_text(text: str) -> dict:
    """Split `SUBJ(CODE) in ROOM` shaped text into its parts."""
    match = RE_SLOT_TEXT.match(text.strip())
    if not match:
        return {"label": text.strip(), "code": None, "is_lab": False, "room": None}
    return {
        "label": _clean(match.group("label")),
        "code": _clean(match.group("code")) or None,
        "is_lab": bool(match.group("lab")),
        "room": _clean(match.group("room")) or None,
    }


def parse_timetable_workbook(content: bytes) -> ParseReport:
    """Parse the supplied .xlsx workbook into a preview report."""
    wb = openpyxl.load_workbook(BytesIO(content), data_only=True, read_only=True)
    report = ParseReport()

    required = {"Batch Index", "Timetable All"}
    missing = required - set(wb.sheetnames)
    if missing:
        raise ValueError(f"Workbook is missing required sheets: {', '.join(sorted(missing))}")

    # ---------- Batch Index ----------
    ws = wb["Batch Index"]
    for row in ws.iter_rows(min_row=2, values_only=True):
        if not row or not _clean(row[0]):
            continue
        report.batches.append(
            {
                "program": _clean(row[0]),
                "semester": int(row[1]),
                "section": _clean(row[2]),
                "batch_title": _clean(row[3]) if len(row) > 3 else "",
                "class_teacher": _clean(row[4]) if len(row) > 4 else None,
            }
        )
    known_batches = {(b["program"], b["semester"], b["section"]) for b in report.batches}

    # ---------- Subjects catalogue ----------
    if "Subjects" in wb.sheetnames:
        ws = wb["Subjects"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not _clean(row[0]):
                continue
            codes = _clean(row[2]) if len(row) > 2 else ""
            report.subjects.append(
                {
                    "name": _clean(row[0]),
                    "codes": [c.strip() for c in codes.split(",") if c.strip()],
                    "abbreviation": _clean(row[3]) if len(row) > 3 else "",
                }
            )
    subjects_by_abbr: dict[str, str] = {}
    subjects_by_code: dict[str, str] = {}
    for s in report.subjects:
        if s["abbreviation"]:
            subjects_by_abbr.setdefault(s["abbreviation"], s["name"])
        for code in s["codes"]:
            subjects_by_code.setdefault(code, s["name"])

    # ---------- Faculty catalogue ----------
    if "Faculty" in wb.sheetnames:
        ws = wb["Faculty"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not _clean(row[0]):
                continue
            report.faculty.append({"full_name": _clean(row[0])})

    # ---------- Rooms catalogue ----------
    if "Rooms" in wb.sheetnames:
        ws = wb["Rooms"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not _clean(row[0]):
                continue
            seating = None
            if len(row) > 2 and row[2] is not None:
                try:
                    seating = int(row[2])
                except (TypeError, ValueError):
                    seating = None
            room_type = _clean(row[1]).lower() if len(row) > 1 else "class"
            report.rooms.append(
                {
                    "name": _clean(row[0]),
                    "room_type": "lab" if room_type == "lab" else "classroom",
                    "seating_capacity": seating,
                }
            )

    # ---------- Subject Offerings (faculty linkage) ----------
    offerings: list[dict] = []
    if "Subject Offerings" in wb.sheetnames:
        ws = wb["Subject Offerings"]
        for row in ws.iter_rows(min_row=2, values_only=True):
            if not row or not _clean(row[0]):
                continue
            try:
                sem = int(row[3])
            except (TypeError, ValueError):
                continue
            offerings.append(
                {
                    "subject": _clean(row[0]),
                    "faculty": _clean(row[1]),
                    "program": _clean(row[2]),
                    "semester": sem,
                    "section": _clean(row[4]),
                }
            )
    faculty_map: dict[tuple, str] = {}
    for o in offerings:
        faculty_map[(o["program"], o["semester"], o["section"], o["subject"].lower())] = o["faculty"]

    # ---------- Timetable All ----------
    ws = wb["Timetable All"]
    pending_labs: dict[tuple, ParsedEntry] = {}
    row_no = 1
    for row in ws.iter_rows(min_row=2, values_only=True):
        row_no += 1
        if not row or not _clean(row[0]):
            continue
        program, semester, section = _clean(row[0]), row[1], _clean(row[2])
        day, period, slot_raw, text = _clean(row[3]), row[4], _clean(row[6]), row[7]
        span = row[8] if len(row) > 8 else 1

        try:
            semester_i = int(semester)
        except (TypeError, ValueError):
            report.errors.append({"row": row_no, "issue": f"Invalid semester {semester!r}"})
            continue
        try:
            period_i = int(period)
        except (TypeError, ValueError):
            report.errors.append({"row": row_no, "issue": f"Invalid period {period!r}"})
            continue
        if day not in DAYS:
            report.errors.append({"row": row_no, "issue": f"Invalid day {day!r}"})
            continue
        if slot_raw not in VALID_SLOT_TYPES:
            report.errors.append({"row": row_no, "issue": f"Unknown slot type {slot_raw!r}"})
            continue
        if (program, semester_i, section) not in known_batches:
            report.warnings.append(
                {"row": row_no, "issue": f"Batch {program}-S{semester_i}-{section} not in Batch Index"}
            )

        slot_type = SLOT_TYPE_MAP[slot_raw]
        key = (program, semester_i, section, day, period_i)

        if slot_type == "lab_continue":
            # continuation of the previous lab: extend the pending entry
            prev = pending_labs.get((program, semester_i, section, day))
            if prev is None:
                report.warnings.append(
                    {"row": row_no, "issue": "lab-continue without a preceding lab; kept as warning-only entry"}
                )
                continue
            prev.period_end = period_i
            prev.is_multi_period = prev.period_end > prev.period_start
            continue

        pending_labs.pop((program, semester_i, section, day), None)

        subject_label, subject_code, room_name = "", None, None
        if slot_type in ("class", "lab", "sametime"):
            if text is None:
                report.warnings.append({"row": row_no, "issue": f"{slot_raw} slot with no text"})
                text = ""
            parts = parse_scheduled_text(str(text))
            subject_label = parts["label"]
            subject_code = parts["code"]
            room_name = parts["room"]
            if slot_type in ("class", "lab") and not room_name:
                report.warnings.append(
                    {"row": row_no, "issue": f"Session {subject_label!r} has no room"}
                )
            # resolve full subject name from the catalogue when possible
            resolved = None
            if subject_code and subject_code in subjects_by_code:
                resolved = subjects_by_code[subject_code]
            elif subject_label in subjects_by_abbr:
                resolved = subjects_by_abbr[subject_label]
            if resolved:
                subject_label = resolved
            if slot_type == "lab" and not parts["is_lab"]:
                # trust the slot type column even if the text lacks (L)
                pass
        elif slot_type == "activity":
            subject_label = _clean(text) if text else "Activity"
            m = re.match(r"^(.*?)\s+in\s+(.+)$", subject_label)
            if m:
                subject_label, room_name = m.group(1), m.group(2)
        elif slot_type == "lunch":
            subject_label = "Lunch"
        elif slot_type == "free":
            subject_label = "Free"

        # faculty: resolve via the Subject Offerings sheet when identifiable
        faculty_name = None
        if slot_type in ("class", "lab", "sametime") and subject_label:
            faculty_name = faculty_map.get((program, semester_i, section, subject_label.lower()))

        entry = ParsedEntry(
            program=program,
            semester=semester_i,
            section=section,
            day=day,
            period_start=period_i,
            period_end=period_i,
            slot_type=slot_type,
            subject_label=subject_label,
            subject_code=subject_code,
            faculty_name=faculty_name,
            room_name=room_name,
            is_multi_period=bool(span and int(span or 1) > 1),
        )
        report.entries.append(entry)
        if slot_type == "lab":
            pending_labs[(program, semester_i, section, day)] = entry

    # ---------- Conflict detection ----------
    seen_slots: dict[tuple, int] = {}
    for i, e in enumerate(report.entries):
        for p in range(e.period_start, e.period_end + 1):
            key = (e.program, e.semester, e.section, e.day, p)
            if key in seen_slots:
                report.warnings.append(
                    {
                        "row": i + 2,
                        "issue": (
                            f"Duplicate slot for {e.program}-S{e.semester}-{e.section} "
                            f"{e.day} P{p}; import will replace the earlier entry"
                        ),
                    }
                )
            seen_slots[key] = i
    room_use: dict[tuple, list[tuple[str, str]]] = {}
    for e in report.entries:
        if e.room_name and e.slot_type in ("class", "lab", "sametime"):
            for p in range(e.period_start, e.period_end + 1):
                room_use.setdefault((e.room_name, e.day, p), []).append(
                    (f"{e.program}-S{e.semester}-{e.section}", e.subject_label)
                )
    shared_sessions = 0
    for (room, day, period), users in room_use.items():
        batches = sorted({b for b, _ in users})
        subjects = sorted({s for _, s in users})
        if len(batches) < 2:
            continue
        if len(subjects) == 1:
            # One subject for several batches at once: a shared common session.
            shared_sessions += 1
            report.warnings.append(
                {
                    "row": None,
                    "kind": "shared_session",
                    "issue": (
                        f"Shared session: {subjects[0]} in {room} on {day} P{period} "
                        f"for {len(batches)} batches simultaneously"
                    ),
                }
            )
        else:
            report.warnings.append(
                {
                    "row": None,
                    "kind": "room_conflict",
                    "issue": (
                        f"Room {room} on {day} P{period} hosts different subjects "
                        f"({', '.join(subjects[:4])}) for {', '.join(batches[:6])}"
                    ),
                }
            )
    conflicts = {
        k: v for k, v in room_use.items()
        if len({b for b, _ in v}) > 1 and len({s for _, s in v}) > 1
    }

    report.stats = {
        "batches": len(report.batches),
        "entries": len(report.entries),
        "multi_period_sessions": sum(1 for e in report.entries if e.is_multi_period),
        "subjects_catalogued": len(report.subjects),
        "faculty_catalogued": len(report.faculty),
        "rooms_catalogued": len(report.rooms),
        "teaching_sessions": sum(1 for e in report.entries if e.slot_type in ("class", "lab", "sametime")),
        "sessions_with_faculty": sum(1 for e in report.entries if e.faculty_name),
        "warnings": len(report.warnings),
        "errors": len(report.errors),
        "shared_sessions": shared_sessions,
        "room_conflicts": len(conflicts),
    }
    return report
