"""Constraint solving for the batch-level seating problem.

Key modelling insight: students within one batch are interchangeable for
the adjacency constraint, so the solver assigns a BATCH to each seat
(with exact per-batch counts), then students are placed into their batch's
seats deterministically. This shrinks the search space enormously.

Primary solver: Google OR-Tools CP-SAT (exact, with a wall-clock limit).
Fallback: custom backtracking with forward checking (exact on small halls,
used when OR-Tools is unavailable).

Both report three outcomes:
  solution      -> dict seat_key -> group
  infeasible    -> proven (solver exhausted the search space)
  unknown       -> time limit hit without proving either way
"""

from __future__ import annotations

import time
from collections import Counter

from .adjacency import adjacency_edges, build_seat_index
from .models import Hall, Policy

SOLUTION = "solution"
INFEASIBLE = "infeasible"
UNKNOWN = "unknown"


def solve_batch_assignment(
    halls: tuple[Hall, ...],
    group_counts: dict[str, int],
    policy: Policy,
    time_limit_seconds: float = 20.0,
    prefer_cpsat: bool = True,
) -> tuple[str, dict[tuple[str, int, int], str] | None, str]:
    """Solve seat -> batch assignment.

    Returns (status, seat_key_to_group | None, solver_name).
    status is SOLUTION, INFEASIBLE or UNKNOWN.
    """
    usable = [s for hall in halls for s in hall.seats if s.usable]
    total_needed = sum(group_counts.values())
    if total_needed > len(usable):
        return INFEASIBLE, None, "precheck"
    if total_needed == 0:
        return SOLUTION, {}, "precheck"

    if prefer_cpsat:
        try:
            from .cpsat import solve_with_cpsat

            return solve_with_cpsat(halls, group_counts, policy, time_limit_seconds)
        except ImportError:
            pass

    return solve_with_backtracking(halls, group_counts, policy, time_limit_seconds)


def solve_with_backtracking(
    halls: tuple[Hall, ...],
    group_counts: dict[str, int],
    policy: Policy,
    time_limit_seconds: float = 20.0,
) -> tuple[str, dict[tuple[str, int, int], str] | None, str]:
    """Batch-level backtracking, most-constrained seat first."""
    if not policy.has_adjacency_constraints:
        # No adjacency restrictions: fill seats in order.
        assignment: dict[tuple[str, int, int], str] = {}
        remaining = dict(group_counts)
        usable = [s for hall in halls for s in hall.seats if s.usable]
        usable.sort(key=lambda s: (s.hall_id, s.row, s.col))
        i = 0
        for group, count in group_counts.items():
            for _ in range(count):
                assignment[usable[i].key] = group
                i += 1
        return SOLUTION, assignment, "backtracking-no-constraint"

    index = build_seat_index(halls)
    edges = adjacency_edges(halls, policy)
    neighbours: dict[tuple[str, int, int], list[tuple[str, int, int]]] = {
        s.key: [] for s in (x for h in halls for x in h.seats if x.usable)
    }
    for a, b in edges:
        neighbours[a.key].append(b.key)
        neighbours[b.key].append(a.key)

    # Order seats: most constrained (highest degree, then position) first.
    # Seats in different halls never constrain each other; processing
    # hall-by-hall lets the search decompose.
    order = sorted(
        neighbours.keys(),
        key=lambda k: (-len(neighbours[k]), k),
    )

    remaining = dict(group_counts)
    assignment: dict[tuple[str, int, int], str] = {}
    deadline = time.monotonic() + time_limit_seconds
    groups_by_size = sorted(group_counts, key=lambda g: -group_counts[g])

    def candidates(seat_key) -> list[str]:
        out = []
        forbidden = {assignment[n] for n in neighbours[seat_key] if n in assignment}
        for g in groups_by_size:
            if remaining[g] > 0 and g not in forbidden:
                out.append(g)
        return out

    def search(position: int) -> dict | None:
        if time.monotonic() > deadline:
            raise TimeoutError
        if all(v == 0 for v in remaining.values()):
            return dict(assignment)
        # find next unassigned seat
        while position < len(order) and order[position] in assignment:
            position += 1
        if position >= len(order):
            return None  # seats exhausted with students left -> infeasible
        seat_key = order[position]
        for group in candidates(seat_key):
            assignment[seat_key] = group
            remaining[group] -= 1
            result = search(position + 1)
            if result is not None:
                return result
            del assignment[seat_key]
            remaining[group] += 1
        return None

    try:
        solution = search(0)
    except TimeoutError:
        return UNKNOWN, None, "backtracking"
    if solution is None:
        return INFEASIBLE, None, "backtracking"
    return SOLUTION, solution, "backtracking"


def students_to_seats(
    solution: dict[tuple[str, int, int], str],
    students: list,
) -> dict[tuple[str, int, int], str]:
    """Map student_id -> seat_key by filling each group's seats in order.

    `students` is a list of objects with student_id and group attributes.
    Returns student_id -> seat_key.
    """
    seats_by_group: dict[str, list[tuple[str, int, int]]] = {}
    for key, group in solution.items():
        seats_by_group.setdefault(group, []).append(key)

    for group in seats_by_group:
        seats_by_group[group].sort()

    result: dict[str, tuple[str, int, int]] = {}
    by_group: dict[str, list] = {}
    for student in students:
        by_group.setdefault(student.group, []).append(student)

    for group, group_students in by_group.items():
        seat_list = seats_by_group.get(group, [])
        if len(seat_list) < len(group_students):
            raise ValueError(f"group {group} has {len(group_students)} students but {len(seat_list)} seats")
        group_students = sorted(group_students, key=lambda s: (s.roll_number, s.student_id))
        for student, seat_key in zip(group_students, seat_list):
            result[student.student_id] = seat_key
    return result


def count_groups(students: list) -> dict[str, int]:
    return dict(Counter(s.group for s in students))
