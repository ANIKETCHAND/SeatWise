"""Shared helpers for algorithm tests."""

from __future__ import annotations

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2] / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from app.algorithms.models import Hall, Policy, Seat, Student, SeatingRequest  # noqa: E402


def rect_hall(hall_id: str, rows: int, cols: int, blocked: set[tuple[int, int]] | None = None) -> Hall:
    """Build a rectangular hall; blocked coordinates are unusable seats."""
    blocked = blocked or set()
    seats = tuple(
        Seat(
            hall_id=hall_id,
            row=r,
            col=c,
            seat_label=f"{chr(ord('A') + r)}{c + 1}",
            usable=(r, c) not in blocked,
        )
        for r in range(rows)
        for c in range(cols)
    )
    return Hall(hall_id=hall_id, name=hall_id, rect_rows=rows, rect_cols=cols, seats=seats)


def make_students(counts: dict[str, int], prefix: str = "S") -> tuple[Student, ...]:
    students = []
    n = 0
    for group, count in counts.items():
        for i in range(count):
            students.append(
                Student(
                    student_id=f"{prefix}{n:04d}",
                    full_name=f"Student {n:04d}",
                    roll_number=f"RN{n:04d}",
                    group=group,
                )
            )
            n += 1
    return tuple(students)


def make_request(counts: dict[str, int], halls: list[Hall], policy: Policy | None = None) -> SeatingRequest:
    return SeatingRequest(
        students=make_students(counts),
        halls=tuple(halls),
        policy=policy or Policy(),
        solver_time_limit_seconds=10.0,
    )
