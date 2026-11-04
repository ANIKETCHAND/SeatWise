"""Engine orchestration: prechecks -> solve -> independent validate -> report.

The engine is the ONLY component allowed to declare an allocation valid,
and it does so exclusively through validator.validate_allocation. Solver
success alone is never sufficient evidence.

Statuses returned (AllocationResult.status):
- valid:      solution produced AND passed independent validation
- infeasible: mathematically proven impossible (pigeonhole, independence
              bounds, or solver exhausting the search space)
- unknown:    the solver could not prove either way within the time limit
- invalid:    a solution was produced but failed validation (engine bug —
              must be surfaced, never hidden)
"""

from __future__ import annotations

import time

from .checkerboard import solve_two_class_checkerboard, is_plain_rectangular
from .independence import checkerboard_partitions, max_independent_set_size
from .models import AllocationResult, Hall, Policy, SeatAssignment, SeatingRequest, Student
from .solver import INFEASIBLE, SOLUTION, UNKNOWN, count_groups, solve_batch_assignment, students_to_seats
from .validator import validate_allocation


def generate_seating(request: SeatingRequest) -> AllocationResult:
    start = time.monotonic()
    students = list(request.students)
    halls = request.halls
    policy = request.policy
    notes: list[str] = []

    total_students = len(students)
    usable_seats = sum(1 for h in halls for s in h.seats if s.usable)

    # ---------- Model 2: pigeonhole ----------
    if total_students > usable_seats:
        deficit = total_students - usable_seats
        return AllocationResult(
            status="infeasible",
            unallocated_students=tuple(s.student_id for s in students),
            explanation=(
                "Allocation is impossible because the number of students exceeds "
                "the available seating capacity (pigeonhole principle)."
            ),
            math_notes=[
                f"|S| = {total_students} students",
                f"|T| = {usable_seats} usable seats",
                f"Capacity difference: {total_students - usable_seats}",
                f"Required additional seats: {deficit}",
            ],
            stats={
                "students_total": total_students,
                "usable_seats_total": usable_seats,
                "capacity_difference": total_students - usable_seats,
                "required_additional_seats": deficit,
            },
            solve_seconds=time.monotonic() - start,
        )

    if total_students == 0:
        return AllocationResult(
            status="valid",
            assignments=(),
            explanation="No students to allocate.",
            math_notes=["|S| = 0: the empty function is trivially injective."],
            stats={
                "students_total": 0,
                "usable_seats_total": usable_seats,
                "seats_occupied": 0,
                "empty_seats": usable_seats,
            },
            solve_seconds=time.monotonic() - start,
        )

    group_counts = count_groups(students)
    restrict = policy.has_adjacency_constraints

    # ---------- Model 3/4: exact prechecks ----------
    if restrict and not policy.block_same_batch_diagonal:
        alpha = max_independent_set_size(halls, policy)
        if alpha is not None:
            worst = max(group_counts.values())
            biggest_group = max(group_counts, key=group_counts.get)  # type: ignore[arg-type]
            if worst > alpha:
                return AllocationResult(
                    status="infeasible",
                    unallocated_students=tuple(s.student_id for s in students),
                    explanation=(
                        f"Allocation impossible: batch {biggest_group} has {worst} students, "
                        f"but the room graph's independence number is α(G) = {alpha}. "
                        "Same-batch students would be forced to sit adjacent."
                    ),
                    math_notes=[
                        "The seat-adjacency graph is bipartite (horizontal/vertical edges only).",
                        "α(G) was computed exactly via König's theorem (maximum matching).",
                        f"Necessary condition max_b |S_b| ≤ α(G) fails: {worst} > {alpha}.",
                    ],
                    stats={
                        "students_total": total_students,
                        "usable_seats_total": usable_seats,
                        "alpha": alpha,
                        "largest_batch": biggest_group,
                        "largest_batch_size": worst,
                    },
                    solve_seconds=time.monotonic() - start,
                )
            notes.append(
                f"α(G) = {alpha} (exact, bipartite grid graph): each batch's size of "
                f"{worst} or fewer satisfies the independence bound."
            )

    # ---------- Solve ----------
    solution: dict[tuple[str, int, int], str] | None = None
    status = UNKNOWN
    solver_name = ""

    distinct_groups = list(group_counts)
    if (
        restrict
        and len(distinct_groups) == 2
        and not policy.block_same_batch_diagonal
        and all(is_plain_rectangular(h) for h in halls)
    ):
        g1, g2 = distinct_groups
        cb = solve_two_class_checkerboard(
            halls, g1, group_counts[g1], g2, group_counts[g2], policy
        )
        if cb is not None:
            solution = cb
            status = SOLUTION
            solver_name = "checkerboard"
            notes.append(
                "Two classes on unobstructed rectangular grid(s): exact "
                "checkerboard construction used (larger class on the larger partition)."
            )
        else:
            notes.append(
                "Checkerboard conditions not met; falling back to the constraint solver."
            )

    solve_started = time.monotonic()
    if solution is None:
        if not restrict:
            # No adjacency constraints: direct fill is exact.
            status, solution, solver_name = SOLUTION, None, "direct-fill"
            solution = _direct_fill(halls, group_counts)
        else:
            status, solution, solver_name = solve_batch_assignment(
                halls, group_counts, policy, request.solver_time_limit_seconds
            )
    solve_seconds = time.monotonic() - solve_started

    if status == INFEASIBLE:
        return _proven_infeasible(students, halls, group_counts, usable_seats, solver_name, time.monotonic() - start, notes)
    if status == UNKNOWN:
        return AllocationResult(
            status="unknown",
            unallocated_students=tuple(s.student_id for s in students),
            explanation=(
                "The solver could not determine whether a valid allocation exists "
                "within the configured time limit. This is NOT a proof of impossibility."
            ),
            math_notes=notes + [
                "Ran out of time before exhausting the search space or finding a solution.",
            ],
            stats={
                "students_total": total_students,
                "usable_seats_total": usable_seats,
            },
            solver_name=solver_name,
            solve_seconds=time.monotonic() - start,
        )
    assert solution is not None

    # ---------- Map students into their group's seats ----------
    student_to_seat = students_to_seats(solution, students)
    students_by_id = {s.student_id: s for s in students}
    seats_by_key = {s.key: s for h in halls for s in h.seats}
    assignments = tuple(
        _to_assignment(students_by_id[student_id], seats_by_key[seat_key])
        for student_id, seat_key in student_to_seat.items()
    )

    # ---------- Independent validation (never trust the solver) ----------
    validation = validate_allocation(
        students, halls, policy, student_to_seat, restrict_same_batch=restrict
    )
    if validation.is_valid:
        final_status = "valid"
        explanation = "Allocation produced and mathematically validated."
    else:
        final_status = "invalid"
        explanation = (
            "The solver returned an allocation that FAILED mathematical validation. "
            "This is an engine defect and must be reported."
        )

    return AllocationResult(
        status=final_status,
        assignments=assignments,
        unallocated_students=tuple(validation.stats.get("unallocated_student_ids", ())),
        explanation=explanation,
        math_notes=notes,
        stats=validation.stats,
        solver_name=solver_name,
        solve_seconds=time.monotonic() - start,
        validation=validation,
    )


def _direct_fill(halls: tuple[Hall, ...], group_counts: dict[str, int]) -> dict[tuple[str, int, int], str]:
    out: dict[tuple[str, int, int], str] = {}
    usable = [s for h in halls for s in h.seats if s.usable]
    usable.sort(key=lambda s: (s.hall_id, s.row, s.col))
    i = 0
    for group in sorted(group_counts, key=lambda g: -group_counts[g]):
        for _ in range(group_counts[group]):
            out[usable[i].key] = group
            i += 1
    return out


def _to_assignment(student: Student, seat) -> SeatAssignment:
    return SeatAssignment(
        student_id=student.student_id,
        full_name=student.full_name,
        roll_number=student.roll_number,
        group=student.group,
        hall_id=seat.hall_id,
        row=seat.row,
        col=seat.col,
        seat_label=seat.seat_label,
    )


def _label(hall_id: str, row: int, col: int) -> str:
    # Fallback human-readable label: row letter + column number, e.g. "A1"
    letter = chr(ord("A") + row) if row < 26 else f"R{row}"
    return f"{letter}{col + 1}"


def _proven_infeasible(
    students: list[Student],
    halls: tuple[Hall, ...],
    group_counts: dict[str, int],
    usable_seats: int,
    solver_name: str,
    seconds: float,
    notes: list[str],
) -> AllocationResult:
    math_notes = list(notes)
    math_notes.append("The constraint solver exhausted the search space without a solution.")
    math_notes.append(
        "Combined with the satisfied independence bounds, this proves no allocation "
        "exists under the current policy (solver-exhaustion infeasibility)."
    )
    return AllocationResult(
        status="infeasible",
        unallocated_students=tuple(s.student_id for s in students),
        explanation=(
            "No valid allocation exists under the current policy. The solver "
            "exhausted the search space (not a timeout)."
        ),
        math_notes=math_notes,
        stats={
            "students_total": len(students),
            "usable_seats_total": usable_seats,
            "group_counts": group_counts,
        },
        solver_name=solver_name,
        solve_seconds=seconds,
    )
