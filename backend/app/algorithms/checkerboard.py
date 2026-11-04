"""Model 4 — checkerboard colouring: an EXACT two-class construction.

For a rectangular, unobstructed R x C grid with horizontal/vertical
restrictions, adjacent seats always have different parity colours, so
placing one class on even seats and the other on odd seats automatically
satisfies the non-adjacency rule.

Exact feasibility conditions (two classes, empty seats allowed, no blocked
seats):
  1. n1 + n2 <= R * C                      (capacity)
  2. max(n1, n2) <= ceil(R * C / 2)        (independence number)

Construction: assign the LARGER class to the LARGER partition. Uneven
grids are handled correctly because the two partitions differ in size.

For multi-hall two-class problems we choose per hall which class takes the
bigger partition, subject to the per-hall capacities. With h halls there
are 2^h choices; we solve the choice with a small search (h is tiny in
practice).

IMPORTANT LIMITATION (documented on the Mathematical Analysis page):
the checkerboard is an exact method ONLY for two classes on unobstructed
rectangular grids with H/V restrictions. For multiple batches, blocked
seats or diagonal restrictions, the engine uses the constraint solver
instead — never the checkerboard.
"""

from __future__ import annotations

import math
from itertools import product

from .models import Hall, Policy, Seat


def two_class_grid_capacity(hall: Hall) -> tuple[int, int]:
    """(larger partition size, smaller partition size) for a full rectangle."""
    total = hall.rect_rows * hall.rect_cols
    return math.ceil(total / 2), math.floor(total / 2)


def is_plain_rectangular(hall: Hall) -> bool:
    """True when every grid cell exists and is usable (no blocked seats)."""
    if len(hall.seats) != hall.rect_rows * hall.rect_cols:
        return False
    return all(s.usable for s in hall.seats)


def solve_two_class_checkerboard(
    halls: list[Hall],
    class_a: str,
    count_a: int,
    class_b: str,
    count_b: int,
    policy: Policy,
) -> dict[tuple[str, int, int], str] | None:
    """Return seat_key -> group, or None when infeasible.

    Only valid when: exactly two classes, H/V restrictions (no diagonal),
    every hall plain rectangular, and empty seats allowed (or exactly
    filling). Feasibility is decided exactly; the construction is exact.
    """
    if policy.block_same_batch_diagonal:
        return None
    if any(not is_plain_rectangular(h) for h in halls):
        return None
    if count_a + count_b > sum(h.rect_rows * h.rect_cols for h in halls):
        return None

    big_a, small_a = count_a, count_b
    # capacities per hall: (larger, smaller)
    caps = [two_class_grid_capacity(h) for h in halls]

    # Decide per hall which class gets the larger partition.
    # Try all orientations when the hall count is small; otherwise a greedy
    # pass (give the class with the larger unplaced count the larger side).
    best: list[int] | None = None
    h = len(halls)
    orientation_sets = (
        list(product([0, 1], repeat=h))
        if h <= 16
        else [None]
    )
    if orientation_sets[0] is None:
        # Greedy: sort halls by (larger-smaller) gap desc — swapping the
        # bigger gap halls helps balance; simple heuristic, still exact
        # feasibility is checked afterwards.
        order = sorted(range(h), key=lambda i: caps[i][0] - caps[i][1], reverse=True)
        remaining_a, remaining_b = big_a, small_a
        chosen = [0] * h
        for i in order:
            larger, smaller = caps[i]
            if remaining_a >= remaining_b:
                chosen[i], placed = 0, min(remaining_a, larger)
                remaining_a -= placed
                remaining_b -= min(remaining_b, smaller)
            else:
                chosen[i], placed = 1, min(remaining_b, larger)
                remaining_b -= placed
                remaining_a -= min(remaining_a, smaller)
        orientation_sets = [tuple(chosen)]

    for orientation in orientation_sets:
        cap_a = sum(caps[i][0] if o == 0 else caps[i][1] for i, o in enumerate(orientation))
        cap_b = sum(caps[i][1] if o == 0 else caps[i][0] for i, o in enumerate(orientation))
        if count_a <= cap_a and count_b <= cap_b:
            best = list(orientation)
            break

    if best is None:
        return None  # proven infeasible for this construction

    result: dict[tuple[str, int, int], str] = {}
    remaining_a, remaining_b = count_a, count_b
    for hall, orientation in zip(halls, best):
        even, odd = _partitions(hall)
        larger_par, smaller_par = (even, odd) if len(even) >= len(odd) else (odd, even)
        first_group = class_a if orientation == 0 else class_b
        second_group = class_b if orientation == 0 else class_a
        for seat in larger_par:
            if first_group == class_a and remaining_a > 0:
                result[seat.key] = first_group
                remaining_a -= 1
            elif first_group == class_b and remaining_b > 0:
                result[seat.key] = first_group
                remaining_b -= 1
        for seat in smaller_par:
            if second_group == class_a and remaining_a > 0:
                result[seat.key] = second_group
                remaining_a -= 1
            elif second_group == class_b and remaining_b > 0:
                result[seat.key] = second_group
                remaining_b -= 1

    # sanity: totals match
    placed_a = sum(1 for g in result.values() if g == class_a)
    placed_b = sum(1 for g in result.values() if g == class_b)
    if placed_a != count_a or placed_b != count_b:
        return None
    return result


def _partitions(hall: Hall) -> tuple[list[Seat], list[Seat]]:
    even = [s for s in hall.seats if s.usable and (s.row + s.col) % 2 == 0]
    odd = [s for s in hall.seats if s.usable and (s.row + s.col) % 2 == 1]
    return even, odd
