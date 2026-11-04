"""CP-SAT (Google OR-Tools) model for the batch-level seating problem.

Variables: for each usable seat s and each group g with count > 0:
    x[s, g] in {0, 1}   -- seat s is occupied by a student of group g

Constraints:
- sum_g x[s, g] == occupied[s]          (at most one student per seat)
- sum_s x[s, g] == count[g]             (every student of the group seated)
- for each adjacency edge (s, t) and each group g:
      x[s, g] + x[t, g] <= 1            (no same-group adjacent pair)

Objective: none needed (feasibility). Empty seats are simply seats with
occupied[s] == 0; we minimise unoccupied usable seats as a soft objective
so the solver prefers compact plans.

Statuses map honestly:
- MODEL_INVALID / booleans exhausted -> INFEASIBLE (proven)
- OPTIMAL / FEASIBLE                 -> SOLUTION
- UNKNOWN (time limit)               -> UNKNOWN (could not determine)
"""

from __future__ import annotations

from ortools.sat.python import cp_model

from .adjacency import adjacency_edges
from .models import Hall, Policy
from .solver import INFEASIBLE, SOLUTION, UNKNOWN


def solve_with_cpsat(
    halls: tuple[Hall, ...],
    group_counts: dict[str, int],
    policy: Policy,
    time_limit_seconds: float = 20.0,
) -> tuple[str, dict[tuple[str, int, int], str] | None, str]:
    model = cp_model.CpModel()

    usable = [s for hall in halls for s in hall.seats if s.usable]
    groups = [g for g, n in group_counts.items() if n > 0]

    x: dict[tuple, cp_model.IntVar] = {}
    for seat in usable:
        for g in groups:
            x[(seat.key, g)] = model.new_bool_var(f"x_{seat.hall_id}_{seat.row}_{seat.col}_{g}")

    # At most one student per seat
    for seat in usable:
        model.add(sum(x[(seat.key, g)] for g in groups) <= 1)

    # Exact group counts
    for g in groups:
        model.add(sum(x[(seat.key, g)] for seat in usable) == group_counts[g])

    # Adjacency: no same-group pair on an edge
    if policy.has_adjacency_constraints:
        for a, b in adjacency_edges(halls, policy):
            for g in groups:
                model.add(x[(a.key, g)] + x[(b.key, g)] <= 1)

    # Soft objective: use as many seats as possible (deterministic compact plans)
    occupied = [model.new_bool_var(f"occ_{s.hall_id}_{s.row}_{s.col}") for s in usable]
    for seat, occ in zip(usable, occupied):
        model.add(sum(x[(seat.key, g)] for g in groups) == occ)
    model.minimize(sum(1 - occ for occ in occupied))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = max(0.5, float(time_limit_seconds))
    solver.parameters.num_search_workers = 8
    status = solver.solve(model)

    if status in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        assignment: dict[tuple[str, int, int], str] = {}
        for seat in usable:
            for g in groups:
                if solver.value(x[(seat.key, g)]):
                    assignment[seat.key] = g
                    break
        return SOLUTION, assignment, "cp-sat"
    if status in (cp_model.INFEASIBLE, cp_model.MODEL_INVALID):
        return INFEASIBLE, None, "cp-sat"
    return UNKNOWN, None, "cp-sat"
