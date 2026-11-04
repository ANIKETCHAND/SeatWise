"""Model 3 — graph representation of a room.

G = (V, E): V is the set of usable seats, E the adjacency edges.
Blocked seats are NOT vertices: they can never be allocated, and they
cannot carry a constraint edge.

Edge selection is policy driven:
- horizontal: seats sharing a side along a row   (r, c) - (r, c+1)
- vertical:   seats sharing a side along a column (r, c) - (r+1, c)
- diagonal:   corners (r, c) - (r+1, c+1) and (r, c+1) - (r+1, c)

Edges never cross halls: adjacency is a per-hall property.
"""

from __future__ import annotations

from collections import defaultdict

from .models import Hall, Policy, Seat

Offset = tuple[int, int]  # (drow, dcol)


def adjacency_offsets(policy: Policy) -> list[Offset]:
    """Neighbour offsets implied by the policy."""
    offsets: list[Offset] = []
    if policy.block_same_batch_horizontal:
        offsets.append((0, 1))
    if policy.block_same_batch_vertical:
        offsets.append((1, 0))
    if policy.block_same_batch_diagonal:
        offsets.extend([(1, 1), (1, -1)])
    return offsets


def build_seat_index(halls: tuple[Hall, ...]) -> dict[tuple[str, int, int], Seat]:
    """Map (hall_id, row, col) -> Seat for quick neighbour lookup."""
    return {seat.key: seat for hall in halls for seat in hall.seats}


def usable_seats(halls: tuple[Hall, ...]) -> list[Seat]:
    return [s for hall in halls for s in hall.seats if s.usable]


def seat_neighbours(
    seat: Seat,
    halls: tuple[Hall, ...],
    policy: Policy,
    index: dict[tuple[str, int, int], Seat] | None = None,
) -> list[Seat]:
    """Usable neighbour seats of `seat` under the policy's edge set.

    A seat at (r, c) is a neighbour of (r + dr, c + dc) for each policy
    offset; the reverse direction is implied because offsets are symmetric.
    A neighbour position exists only if a seat with that coordinate exists
    (sparse layouts / blocked seats are simply absent).
    """
    if index is None:
        index = build_seat_index(halls)
    neighbours: list[Seat] = []
    for dr, dc in adjacency_offsets(policy):
        other = index.get((seat.hall_id, seat.row + dr, seat.col + dc))
        if other is not None and other.usable:
            neighbours.append(other)
        # also the mirrored direction, e.g. (0,-1) for (0,1)
        other = index.get((seat.hall_id, seat.row - dr, seat.col - dc))
        if other is not None and other.usable:
            neighbours.append(other)
    return neighbours


def adjacency_edges(halls: tuple[Hall, ...], policy: Policy) -> list[tuple[Seat, Seat]]:
    """All undirected adjacency edges between usable seats, deduplicated."""
    index = build_seat_index(halls)
    edges: list[tuple[Seat, Seat]] = []
    seen: set[tuple[tuple, tuple]] = set()
    for hall in halls:
        for seat in hall.seats:
            if not seat.usable:
                continue
            for dr, dc in adjacency_offsets(policy):
                other = index.get((seat.hall_id, seat.row + dr, seat.col + dc))
                if other is None or not other.usable:
                    continue
                pair = tuple(sorted([seat.key, other.key]))
                if pair in seen:
                    continue
                seen.add(pair)
                edges.append((seat, other))
    return edges


def degree_map(halls: tuple[Hall, ...], policy: Policy) -> dict[tuple[str, int, int], int]:
    degrees: dict[tuple[str, int, int], int] = defaultdict(int)
    for a, b in adjacency_edges(halls, policy):
        degrees[a.key] += 1
        degrees[b.key] += 1
    return degrees
