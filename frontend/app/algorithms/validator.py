"""Independent mathematical validation of any allocation.

This module NEVER trusts the solver. Given a roster, halls and a proposed
allocation (student -> seat), it re-derives every mathematical property
from first principles:

Model 1 (injective function):
  - every assigned student is on the roster
  - every roster student is assigned at most once
  - every seat is used at most once
  - every used seat exists in the layout and is usable (not blocked)
  - no roster student is silently omitted (unallocated ones are reported)

Model 2 (pigeonhole):
  - |S| > |T|  =>  allocation impossible (reported as infeasible input)

Model 3 (graph adjacency):
  - for every policy edge (horizontal/vertical/diagonal), the two endpoint
    seats must not hold students of the same restricted batch
"""

from __future__ import annotations

from dataclasses import dataclass, field

from .adjacency import adjacency_edges, build_seat_index
from .models import Hall, Policy, Student


@dataclass(slots=True)
class ValidationIssue:
    code: str
    message: str
    details: dict = field(default_factory=dict)


@dataclass(slots=True)
class ValidationResult:
    status: str  # "valid" | "invalid"
    issues: list[ValidationIssue] = field(default_factory=list)
    stats: dict = field(default_factory=dict)

    @property
    def is_valid(self) -> bool:
        return self.status == "valid"


def validate_allocation(
    students: tuple[Student, ...] | list[Student],
    halls: tuple[Hall, ...],
    policy: Policy,
    allocation: dict[str, tuple[str, int, int]] | list[tuple[str, tuple[str, int, int]]],
    restrict_same_batch: bool = True,
) -> ValidationResult:
    """Validate `allocation`: student_id -> (hall_id, row, col).

    restrict_same_batch=False checks only structural (Model 1) properties;
    used for classroom mode where adjacency rules are off by default.
    """
    issues: list[ValidationIssue] = []

    roster = {s.student_id: s for s in students}
    seat_index = build_seat_index(halls)
    usable_keys = {k for k, s in seat_index.items() if s.usable}

    # --- Model 1: injective function S -> T ---
    seen_students: set[str] = set()
    seen_seats: dict[tuple, str] = {}
    occupancy: dict[tuple, str] = {}  # seat_key -> group

    alloc_items = allocation.items() if hasattr(allocation, "items") else allocation
    for student_id, seat_key in alloc_items:
        if student_id not in roster:
            issues.append(
                ValidationIssue(
                    "student_not_in_roster",
                    f"Assigned student {student_id} is not part of the selected roster.",
                    {"student_id": student_id},
                )
            )
            continue
        if student_id in seen_students:
            issues.append(
                ValidationIssue(
                    "duplicate_student_assignment",
                    f"Student {student_id} is assigned more than once.",
                    {"student_id": student_id},
                )
            )
        seen_students.add(student_id)

        if seat_key not in seat_index:
            issues.append(
                ValidationIssue(
                    "seat_not_in_layout",
                    f"Seat {seat_key} does not exist in any hall layout.",
                    {"seat": seat_key},
                )
            )
            continue
        if seat_key not in usable_keys:
            issues.append(
                ValidationIssue(
                    "blocked_seat_allocated",
                    f"Seat {seat_key} is blocked and must never receive a student.",
                    {"seat": seat_key},
                )
            )
        if seat_key in seen_seats:
            issues.append(
                ValidationIssue(
                    "duplicate_seat_assignment",
                    f"Seat {seat_key} is assigned to more than one student.",
                    {"seat": seat_key, "students": [seen_seats[seat_key], student_id]},
                )
            )
        seen_seats[seat_key] = student_id
        occupancy[seat_key] = roster[student_id].group

    missing = [sid for sid in roster if sid not in seen_students]
    if missing and not restrict_same_batch:
        pass  # classroom mode tolerates absences; exam mode reports via stats
    stats = {
        "students_total": len(roster),
        "students_allocated": len(occupancy),
        "students_unallocated": len(missing),
        "usable_seats_total": len(usable_keys),
        "seats_occupied": len(seen_seats),
        "empty_seats": len(usable_keys) - len(seen_seats),
    }
    if missing:
        stats["unallocated_student_ids"] = missing[:200]

    # --- Model 2: pigeonhole (informational; engine prechecks too) ---
    if len(roster) > len(usable_keys):
        issues.append(
            ValidationIssue(
                "capacity_exceeded",
                "Allocation impossible: number of students exceeds usable seats "
                "(pigeonhole principle).",
                {"students": len(roster), "usable_seats": len(usable_keys)},
            )
        )

    # --- Model 3: adjacency ---
    adjacency_violations = []
    if restrict_same_batch and policy.has_adjacency_constraints:
        for a, b in adjacency_edges(halls, policy):
            ga = occupancy.get(a.key)
            gb = occupancy.get(b.key)
            if ga is not None and ga == gb:
                adjacency_violations.append((a.key, b.key, ga))
        if adjacency_violations:
            issues.append(
                ValidationIssue(
                    "adjacency_conflict",
                    f"{len(adjacency_violations)} adjacent seat pair(s) hold students "
                    "of the same batch.",
                    {
                        "pairs": [
                            {"seat_a": a, "seat_b": b, "group": g}
                            for a, b, g in adjacency_violations[:100]
                        ]
                    },
                )
            )

    status = "valid" if not issues else "invalid"
    return ValidationResult(status=status, issues=issues, stats=stats)
