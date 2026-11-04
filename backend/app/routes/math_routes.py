"""Routes: mathematics endpoints backing the Mathematical Analysis page.

Delegates core combinatorial graph theory calculations to math_service.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..auth import AuthContext, require_authenticated
from ..schemas.index import (
    AdjacencyCheckRequest,
    CapacityCheckRequest,
    CheckerboardRequest,
    ConstraintSolveRequest,
)
from ..services import math_service

router = APIRouter(prefix="/math", tags=["mathematics"])


@router.post("/capacity", summary="Calculate theoretical and usable grid capacity")
def capacity_check(
    payload: CapacityCheckRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    return math_service.calculate_grid_capacity(
        rows=payload.rows,
        columns=payload.columns,
        blocked=payload.blocked,
    )


@router.post("/checkerboard", summary="Exact two-class feasibility and checkerboard partition geometry")
def checkerboard(
    payload: CheckerboardRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    return math_service.evaluate_checkerboard_feasibility(
        rows=payload.rows,
        columns=payload.columns,
        class_a=payload.class_a,
        class_b=payload.class_b,
    )


@router.post("/adjacency", summary="Check graph coloring neighborhood violations")
def adjacency_check(
    payload: AdjacencyCheckRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    return math_service.evaluate_adjacency_conflicts(
        rows=payload.rows,
        columns=payload.columns,
        blocked=payload.blocked,
        allocation=payload.allocation,
        include_diagonal=payload.include_diagonal,
    )


@router.post("/solve", summary="Execute CP-SAT multi-class grid allocation")
def constraint_solve(
    payload: ConstraintSolveRequest, auth: AuthContext = Depends(require_authenticated)
) -> dict:
    return math_service.solve_grid_constraints(
        rows=payload.rows,
        columns=payload.columns,
        blocked=payload.blocked,
        groups=payload.groups,
        include_diagonal=payload.include_diagonal,
    )
