"""Exact independence number for the seat-adjacency graph.

For a rectangular, unobstructed R x C grid with only horizontal/vertical
edges, the graph is bipartite with partitions of sizes
ceil(R*C/2) and floor(R*C/2), and alpha(G) = ceil(R*C/2).

For arbitrary layouts (blocked seats, sparse grids) the formula does not
apply blindly. However, any grid graph built from 4-neighbour adjacency is
still bipartite via color(r, c) = (r + c) mod 2, and for bipartite graphs

    alpha(G) = |V| - nu(G)          (Koenig's theorem)

where nu(G) is the size of a maximum matching. We compute nu exactly with
Hopcroft-Karp, so alpha is exact for any blocked/sparse layout as long as
only horizontal+vertical edges are used.

With diagonal edges the graph is generally NOT bipartite, and we fall back
to reporting no exact bound (the function returns None).
"""

from __future__ import annotations

from collections import deque

from .adjacency import adjacency_edges
from .models import Hall, Policy


def _hopcroft_karp(adj: dict[int, list[int]], n_left: int) -> int:
    """Maximum matching size on a bipartite graph.

    adj: left-vertex -> list of right-vertices. Left vertices are 0..n_left-1;
    right vertices use the raw ids from adj values.
    """
    INF = float("inf")
    pair_left: dict[int, int | None] = {u: None for u in adj}
    pair_right: dict[int, int | None] = {}
    for u, vs in adj.items():
        for v in vs:
            pair_right.setdefault(v, None)

    dist: dict[int, float] = {}

    def bfs() -> bool:
        queue: deque[int] = deque()
        for u in adj:
            if pair_left[u] is None:
                dist[u] = 0
                queue.append(u)
            else:
                dist[u] = INF
        found = False
        while queue:
            u = queue.popleft()
            for v in adj[u]:
                pu = pair_right.get(v)
                if pu is None:
                    found = True
                elif dist.get(pu, INF) == INF:
                    dist[pu] = dist[u] + 1
                    queue.append(pu)
        return found

    def dfs(u: int) -> bool:
        for v in adj[u]:
            pu = pair_right.get(v)
            if pu is None or (
                dist.get(pu, INF) == dist[u] + 1 and dfs(pu)
            ):
                pair_left[u] = v
                pair_right[v] = u
                return True
        dist[u] = INF
        return False

    matching = 0
    while bfs():
        for u in list(adj):
            if pair_left[u] is None and dfs(u):
                matching += 1
    return matching


def max_independent_set_size(
    halls: tuple[Hall, ...], policy: Policy
) -> int | None:
    """Exact alpha(G) for the usable-seat adjacency graph.

    Returns None when the graph is not bipartite (e.g. diagonal edges
    enabled) or when there are no usable seats.
    """
    if policy.block_same_batch_diagonal:
        return None  # diagonals can create odd cycles

    edges = adjacency_edges(halls, policy)
    all_usable = {s.key for hall in halls for s in hall.seats if s.usable}
    if not edges:
        # No adjacency edges at all: every usable seat is an isolated vertex,
        # so the whole set is independent.
        return len(all_usable)
    seats = sorted({a.key for a, _ in edges} | {b.key for _, b in edges})
    if not seats:
        return 0
    seat_pos = {k: i for i, k in enumerate(seats)}

    # Bipartition by (row + col) parity — valid for 4-neighbour grids.
    adj: dict[int, list[int]] = {}
    for a, b in edges:
        ua, ub = seat_pos[a.key], seat_pos[b.key]
        if (a.row + a.col) % 2 == 0:
            adj.setdefault(ua, []).append(ub)
        else:
            adj.setdefault(ub, []).append(ua)

    n_left = len(seats)  # upper bound; isolated left vertices allowed
    nu = _hopcroft_karp(adj, n_left)
    # alpha = |V| - nu across ALL usable seats, including isolated ones.
    return len(all_usable) - nu


def checkerboard_partitions(hall: Hall) -> tuple[list[Seat], list[Seat]]:
    """Split a hall's usable seats into the two parity partitions.

    colour(r, c) = (r + c) mod 2. On a full rectangular grid the first
    partition has ceil(R*C/2) seats and the second floor(R*C/2).
    """
    even: list[Seat] = []
    odd: list[Seat] = []
    for seat in sorted(hall.seats, key=lambda s: (s.row, s.col)):
        if not seat.usable:
            continue
        (even if (seat.row + seat.col) % 2 == 0 else odd).append(seat)
    return even, odd
