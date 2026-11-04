"""Mathematics Analysis and Optimization Services.

Implements graph theory calculations and optimization helpers for grid graphs P_r box P_c:
- Theoretical capacity & independence number alpha(G)
- Checkerboard 2-coloring partitions and feasibility validation
- Neighborhood adjacency conflict detection
- Multi-class CP-SAT constraint satisfaction
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple

from ..algorithms import (
    Hall,
    Policy,
    Seat,
    Student,
    SeatingRequest,
    generate_seating,
    validate_allocation,
)
from ..algorithms.checkerboard import two_class_grid_capacity
from ..algorithms.independence import checkerboard_partitions, max_independent_set_size
from ..algorithms.solver import solve_batch_assignment


def create_grid_hall(rows: int, columns: int, blocked: List[List[int]]) -> Hall:
    """Build a virtual Hall representation of an R x C rectangular seating grid."""
    blocked_set = {(r, c) for r, c in blocked}
    seats = tuple(
        Seat(
            hall_id="grid",
            row=r,
            col=c,
            seat_label=f"{chr(ord('A') + r)}{c + 1}",
            usable=(r, c) not in blocked_set,
        )
        for r in range(rows)
        for c in range(columns)
    )
    return Hall(hall_id="grid", name="Interactive grid", rect_rows=rows, rect_cols=columns, seats=seats)


def calculate_grid_capacity(rows: int, columns: int, blocked: List[List[int]]) -> Dict[str, Any]:
    """Calculate theoretical and usable capacity, partitions, and independence number alpha(G)."""
    hall = create_grid_hall(rows, columns, blocked)
    usable = sum(1 for s in hall.seats if s.usable)
    alpha = max_independent_set_size((hall,), Policy())
    big, small = two_class_grid_capacity(hall)
    formula = (
        f"alpha(G) = ceil(R*C/2) = ceil({rows}*{columns}/2) = {big} "
        "holds for an unobstructed rectangular grid with horizontal/vertical edges only."
        if not blocked
        else "Rectangular formula does NOT apply with blocked seats; the exact value "
             "was computed via Konig's theorem (maximum matching on the bipartite grid graph)."
    )
    return {
        "total_seats": rows * columns,
        "usable_seats": usable,
        "blocked_seats": rows * columns - usable,
        "checkerboard_partitions": {"larger": big, "smaller": small},
        "alpha_hv": alpha,
        "alpha_formula": formula,
    }


def evaluate_checkerboard_feasibility(
    rows: int, columns: int, class_a: int, class_b: int
) -> Dict[str, Any]:
    """Evaluate exact two-class feasibility and checkerboard partition geometry."""
    hall = create_grid_hall(rows, columns, [])
    big, small = two_class_grid_capacity(hall)
    total = rows * columns

    students = tuple(
        Student(
            student_id=f"A{i}" if i < class_a else f"B{i - class_a}",
            full_name="",
            roll_number="",
            group="A" if i < class_a else "B",
        )
        for i in range(class_a + class_b)
    )
    result = generate_seating(
        SeatingRequest(students=students, halls=(hall,), policy=Policy())
    )
    grid = [[None for _ in range(columns)] for _ in range(rows)]
    for a in result.assignments:
        grid[a.row][a.col] = a.group
    even, odd = checkerboard_partitions(hall)
    return {
        "feasible": result.status == "valid",
        "status": result.status,
        "explanation": result.explanation,
        "math_notes": list(result.math_notes),
        "conditions": {
            "total_students": class_a + class_b,
            "total_seats": total,
            "capacity_ok": class_a + class_b <= total,
            "larger_class": max(class_a, class_b),
            "larger_partition": big,
            "independence_ok": max(class_a, class_b) <= big,
        },
        "partitions": {
            "even": [[s.row, s.col] for s in even],
            "odd": [[s.row, s.col] for s in odd],
        },
        "grid": grid,
    }


# Backward-compatibility alias
construct_checkerboard_allocation = evaluate_checkerboard_feasibility


def evaluate_adjacency_conflicts(
    rows: int,
    columns: int,
    blocked: List[List[int]],
    allocation: List[List[str | None]],
    include_diagonal: bool,
) -> Dict[str, Any]:
    """Detect same-batch adjacent placements violating graph coloring constraints."""
    hall = create_grid_hall(rows, columns, blocked)
    policy = Policy(block_same_batch_diagonal=include_diagonal)

    students = tuple(
        Student(student_id=f"g{r}-{c}", full_name="", roll_number="", group=cell)
        for r, row in enumerate(allocation)
        for c, cell in enumerate(row)
        if cell
    )
    alloc_map = {
        f"g{r}-{c}": ("grid", r, c)
        for r, row in enumerate(allocation)
        for c, cell in enumerate(row)
        if cell
    }
    validation = validate_allocation(students, (hall,), policy, alloc_map)
    conflicts = []
    for issue in validation.issues:
        if issue.code == "adjacency_conflict":
            conflicts = [
                {"seat_a": pair["seat_a"], "seat_b": pair["seat_b"], "group": pair["group"]}
                for pair in issue.details.get("pairs", [])
            ]
    return {
        "status": validation.status,
        "issues": [{"code": i.code, "message": i.message} for i in validation.issues],
        "conflicts": conflicts,
        "stats": validation.stats,
    }


def solve_grid_constraints(
    rows: int,
    columns: int,
    blocked: List[List[int]],
    groups: Dict[str, int],
    include_diagonal: bool,
) -> Dict[str, Any]:
    """Run CP-SAT solver on an interactive grid with requested group sizes and policies."""
    hall = create_grid_hall(rows, columns, blocked)
    policy = Policy(block_same_batch_diagonal=include_diagonal)
    status, solution, solver_name = solve_batch_assignment(
        (hall,), groups, policy, time_limit_seconds=10.0
    )
    grid = [[None for _ in range(columns)] for _ in range(rows)]
    if solution:
        for (hall_id, r, c), group in solution.items():
            grid[r][c] = group
    students = tuple(
        Student(student_id=f"{g}-{i}", full_name="", roll_number="", group=g)
        for g, n in groups.items()
        for i in range(n)
    )
    result_status = {"solution": "valid", "infeasible": "infeasible", "unknown": "unknown"}[status]
    validation = None
    if solution:
        result = generate_seating(
            SeatingRequest(students=students, halls=(hall,), policy=policy, solver_time_limit_seconds=10.0)
        )
        result_status = result.status
        validation = {"stats": result.stats, "notes": list(result.math_notes)}
    return {
        "status": result_status,
        "solver": solver_name,
        "grid": grid,
        "validation": validation,
    }
