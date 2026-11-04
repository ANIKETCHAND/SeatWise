"""Routes: mathematics endpoints backing the Mathematical Analysis page.

These run the SAME engine code used for real seating — no separate toy
implementation — so the interactive visualizations behave identically to
the actual allocator.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..algorithms import Hall, Policy, Seat, Student, generate_seating, validate_allocation
from ..algorithms.checkerboard import two_class_grid_capacity
from ..algorithms.independence import checkerboard_partitions, max_independent_set_size
from ..algorithms.solver import solve_batch_assignment
from ..auth import AuthContext, require_authenticated
from ..schemas.index import (
    AdjacencyCheckRequest,
    CapacityCheckRequest,
    CheckerboardRequest,
    ConstraintSolveRequest,
)

router = APIRouter(prefix="/math", tags=["mathematics"])


def _grid_hall(rows: int, columns: int, blocked: list[list[int]]) -> Hall:
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


@router.post("/capacity")
def capacity_check(
    payload: CapacityCheckRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    hall = _grid_hall(payload.rows, payload.columns, payload.blocked)
    usable = sum(1 for s in hall.seats if s.usable)
    alpha = max_independent_set_size((hall,), Policy())
    big, small = two_class_grid_capacity(hall)
    return {
        "total_seats": payload.rows * payload.columns,
        "usable_seats": usable,
        "blocked_seats": payload.rows * payload.columns - usable,
        "checkerboard_partitions": {"larger": big, "smaller": small},
        "alpha_hv": alpha,
        "alpha_formula": (
            f"alpha(G) = ceil(R*C/2) = ceil({payload.rows}*{payload.columns}/2) = {big} "
            "holds for an unobstructed rectangular grid with horizontal/vertical edges only."
            if not payload.blocked
            else "Rectangular formula does NOT apply with blocked seats; the exact value "
                 "was computed via Konig's theorem (maximum matching on the bipartite grid graph)."
        ),
    }


@router.post("/checkerboard")
def checkerboard(
    payload: CheckerboardRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    """Exact two-class feasibility + partition visualisation."""
    hall = _grid_hall(payload.rows, payload.columns, [])
    big, small = two_class_grid_capacity(hall)
    total = payload.rows * payload.columns

    students = tuple(
        Student(
            student_id=f"A{i}" if i < payload.class_a else f"B{i - payload.class_a}",
            full_name="",
            roll_number="",
            group="A" if i < payload.class_a else "B",
        )
        for i in range(payload.class_a + payload.class_b)
    )
    result = generate_seating(
        __import__("app.algorithms", fromlist=["SeatingRequest"]).SeatingRequest(
            students=students, halls=(hall,), policy=Policy()
        )
    )
    grid = [[None for _ in range(payload.columns)] for _ in range(payload.rows)]
    for a in result.assignments:
        grid[a.row][a.col] = a.group
    even, odd = checkerboard_partitions(hall)
    return {
        "feasible": result.status == "valid",
        "status": result.status,
        "explanation": result.explanation,
        "math_notes": list(result.math_notes),
        "conditions": {
            "total_students": payload.class_a + payload.class_b,
            "total_seats": total,
            "capacity_ok": payload.class_a + payload.class_b <= total,
            "larger_class": max(payload.class_a, payload.class_b),
            "larger_partition": big,
            "independence_ok": max(payload.class_a, payload.class_b) <= big,
        },
        "partitions": {
            "even": [[s.row, s.col] for s in even],
            "odd": [[s.row, s.col] for s in odd],
        },
        "grid": grid,
    }


@router.post("/adjacency")
def adjacency_check(
    payload: AdjacencyCheckRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    hall = _grid_hall(payload.rows, payload.columns, payload.blocked)
    policy = Policy(block_same_batch_diagonal=payload.include_diagonal)

    students = tuple(
        Student(student_id=f"g{r}-{c}", full_name="", roll_number="", group=cell)
        for r, row in enumerate(payload.allocation)
        for c, cell in enumerate(row)
        if cell
    )
    allocation = {
        f"g{r}-{c}": ("grid", r, c)
        for r, row in enumerate(payload.allocation)
        for c, cell in enumerate(row)
        if cell
    }
    validation = validate_allocation(students, (hall,), policy, allocation)
    conflicts = []
    for issue in validation.issues:
        if issue.code == "adjacency_conflict":
            conflicts = [
                {"seat_a": pair["seat_a"], "seat_b": pair["seat_b"], "group": pair["group"]}
                for pair in issue.details.get("pairs", [])
            ]
    return {
        "status": validation.status,
        "issues": [
            {"code": i.code, "message": i.message} for i in validation.issues
        ],
        "conflicts": conflicts,
        "stats": validation.stats,
    }


@router.post("/solve")
def constraint_solve(
    payload: ConstraintSolveRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    """Run the real CP-SAT solver on an interactive grid."""
    hall = _grid_hall(payload.rows, payload.columns, payload.blocked)
    policy = Policy(block_same_batch_diagonal=payload.include_diagonal)
    status, solution, solver_name = solve_batch_assignment(
        (hall,), payload.groups, policy, time_limit_seconds=10.0
    )
    grid = [[None for _ in range(payload.columns)] for _ in range(payload.rows)]
    if solution:
        for (hall_id, r, c), group in solution.items():
            grid[r][c] = group
    students = tuple(
        Student(student_id=f"{g}-{i}", full_name="", roll_number="", group=g)
        for g, n in payload.groups.items()
        for i in range(n)
    )
    result_status = {"solution": "valid", "infeasible": "infeasible", "unknown": "unknown"}[status]
    validation = None
    if solution:
        from ..algorithms import SeatingRequest

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
