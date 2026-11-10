"""Required mathematical test cases (master spec, section 20A).

Expected two-class outcomes:
- 4x6, 10/8:   valid
- 4x6, 12/12:  valid
- 4x6, 13/11:  infeasible (13 > ceil(24/2) = 12, independence bound)
- 3x3, 5/4:    valid
- 3x3, 6/3:    infeasible (6 > ceil(9/2) = 5)
- 2x2, 2/2:    valid
- 1x1, 1/0:    valid
"""

from __future__ import annotations

import itertools

import itertools

import pytest

from conftest import make_request, make_students, rect_hall
from app.algorithms import Policy, generate_seating, validate_allocation
from app.algorithms.solver import solve_batch_assignment
from app.algorithms.independence import max_independent_set_size


def brute_force_feasible(counts, rows, cols, policy=None):
    """Exhaustive check on tiny grids: does ANY valid batch assignment exist?"""
    policy = policy or Policy()
    seats = [(r, c) for r in range(rows) for c in range(cols)]
    total = sum(counts.values())
    assert total <= len(seats)
    groups = []
    for g, n in counts.items():
        groups.extend([g] * n)
    groups.extend([None] * (len(seats) - total))

    def ok(assign):
        occ = dict(zip(seats, assign))
        for (r, c), g in occ.items():
            if g is None:
                continue
            if policy.block_same_batch_horizontal and (r, c + 1) in occ and occ[(r, c + 1)] == g:
                return False
            if policy.block_same_batch_vertical and (r + 1, c) in occ and occ[(r + 1, c)] == g:
                return False
            if policy.block_same_batch_diagonal:
                for dr, dc in ((1, 1), (1, -1)):
                    if (r + dr, c + dc) in occ and occ[(r + dr, c + dc)] == g:
                        return False
        return True

    for perm in set(itertools.permutations(groups)):
        if ok(perm):
            return True
    return False


class TestRequiredTwoClassCases:
    def test_4x6_10_8_valid(self):
        result = generate_seating(make_request({"A": 10, "B": 8}, [rect_hall("H", 4, 6)]))
        assert result.status == "valid"
        assert result.validation.is_valid
        assert len(result.assignments) == 18

    def test_4x6_12_12_valid(self):
        result = generate_seating(make_request({"A": 12, "B": 12}, [rect_hall("H", 4, 6)]))
        assert result.status == "valid"
        assert result.validation.is_valid
        assert len(result.assignments) == 24  # bijective

    def test_4x6_13_11_infeasible(self):
        result = generate_seating(make_request({"A": 13, "B": 11}, [rect_hall("H", 4, 6)]))
        assert result.status == "infeasible"
        assert any("independence" in note or "α" in note for note in result.math_notes)

    def test_3x3_5_4_valid(self):
        result = generate_seating(make_request({"A": 5, "B": 4}, [rect_hall("H", 3, 3)]))
        assert result.status == "valid"
        assert result.validation.is_valid

    def test_3x3_6_3_infeasible(self):
        result = generate_seating(make_request({"A": 6, "B": 3}, [rect_hall("H", 3, 3)]))
        assert result.status == "infeasible"

    def test_2x2_2_2_valid(self):
        result = generate_seating(make_request({"A": 2, "B": 2}, [rect_hall("H", 2, 2)]))
        assert result.status == "valid"
        assert result.validation.is_valid

    def test_1x1_1_0_valid(self):
        result = generate_seating(make_request({"A": 1}, [rect_hall("H", 1, 1)]))
        assert result.status == "valid"
        assert len(result.assignments) == 1


class TestCapacityAndPigeonhole:
    def test_more_students_than_seats_infeasible(self):
        result = generate_seating(make_request({"A": 30, "B": 30}, [rect_hall("H", 4, 6)]))
        assert result.status == "infeasible"
        assert "pigeonhole" in result.explanation.lower()
        stats = result.stats
        assert stats["students_total"] == 60
        assert stats["usable_seats_total"] == 24
        assert stats["required_additional_seats"] == 36

    def test_empty_roster_valid(self):
        result = generate_seating(make_request({}, [rect_hall("H", 4, 6)]))
        assert result.status == "valid"
        assert len(result.assignments) == 0


class TestBlockedSeats:
    def test_blocked_seat_never_allocated(self):
        blocked = {(1, 1)}
        result = generate_seating(
            make_request({"A": 12, "B": 11}, [rect_hall("H", 4, 6, blocked)])
        )
        assert result.status == "valid"
        for a in result.assignments:
            assert (a.row, a.col) != (1, 1)

    def test_blocked_seats_reduce_capacity_properly(self):
        # 4x6 = 24 seats, 2 blocked -> 22 usable; 12/10 fits by checkerboard
        # fallback since grid no longer plain rectangular -> uses solver
        result = generate_seating(
            make_request({"A": 12, "B": 10}, [rect_hall("H", 4, 6, {(0, 0), (3, 5)})])
        )
        assert result.status == "valid"
        assert len(result.assignments) == 22

    def test_independence_number_with_blocked_seats(self):
        # 2x2 grid with 1 blocked seat = path of 3 vertices, alpha = 2
        halls = (rect_hall("H", 2, 2, {(1, 1)}),)
        policy = Policy()
        assert max_independent_set_size(halls, policy) == 2


class TestMultipleBatches:
    def test_three_batches_valid(self):
        result = generate_seating(
            make_request({"A": 4, "B": 4, "C": 4}, [rect_hall("H", 3, 4)])
        )
        assert result.status == "valid"
        assert result.validation.is_valid

    def test_many_batches_match_brute_force(self):
        for counts, rows, cols in [
            ({"A": 2, "B": 2, "C": 2}, 2, 3),
            ({"A": 3, "B": 2, "C": 1}, 2, 3),
            ({"A": 2, "B": 2}, 2, 2),
            ({"A": 1, "B": 1, "C": 1, "D": 1}, 2, 2),
        ]:
            expected = brute_force_feasible(counts, rows, cols)
            result = generate_seating(
                make_request(counts, [rect_hall("H", rows, cols)])
            )
            if expected:
                assert result.status == "valid", (counts, rows, cols, result.explanation)
                assert result.validation.is_valid
            else:
                assert result.status == "infeasible", (counts, rows, cols)


class TestMultipleHalls:
    def test_two_halls_two_classes(self):
        halls = [rect_hall("H1", 3, 4), rect_hall("H2", 3, 4)]
        result = generate_seating(make_request({"A": 7, "B": 6}, halls))
        assert result.status == "valid"
        assert result.validation.is_valid
        hall_ids = {a.hall_id for a in result.assignments}
        assert hall_ids == {"H1", "H2"}

    def test_hall_capacity_respected(self):
        # H1 seats 12, H2 seats 6; 15 students fit only by using both
        halls = [rect_hall("H1", 3, 4), rect_hall("H2", 2, 3)]
        result = generate_seating(make_request({"A": 8, "B": 7}, halls))
        assert result.status == "valid"
        assert result.validation.is_valid


class TestAdjacencyValidation:
    def _conflicting_allocation(self):
        students = make_students({"A": 4})
        hall = rect_hall("H", 2, 2)
        # all four same-batch students in a 2x2 -> horizontal conflict
        allocation = {
            s.student_id: ("H", s_row, s_col)
            for s, (s_row, s_col) in zip(students, [(0, 0), (0, 1), (1, 0), (1, 1)])
        }
        return students, hall, allocation

    def test_horizontal_conflict_detected(self):
        students, hall, allocation = self._conflicting_allocation()
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert not result.is_valid
        assert any(i.code == "adjacency_conflict" for i in result.issues)

    def test_vertical_conflict_detected(self):
        students = make_students({"A": 2})
        hall = rect_hall("H", 2, 1)
        allocation = {students[0].student_id: ("H", 0, 0), students[1].student_id: ("H", 1, 0)}
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert not result.is_valid

    def test_diagonal_allowed_by_default(self):
        students = make_students({"A": 2})
        hall = rect_hall("H", 2, 2)
        allocation = {students[0].student_id: ("H", 0, 0), students[1].student_id: ("H", 1, 1)}
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert result.is_valid

    def test_diagonal_conflict_when_enabled(self):
        students = make_students({"A": 2})
        hall = rect_hall("H", 2, 2)
        allocation = {students[0].student_id: ("H", 0, 0), students[1].student_id: ("H", 1, 1)}
        policy = Policy(block_same_batch_diagonal=True)
        result = validate_allocation(students, (hall,), policy, allocation)
        assert not result.is_valid
        # 2x2 with H+V+D restrictions is the complete graph K4: two same-batch
        # students can never both fit, so the engine must prove infeasibility.
        engine_result = generate_seating(make_request({"A": 2}, [rect_hall("H", 2, 2)], Policy(block_same_batch_diagonal=True)))
        assert engine_result.status == "infeasible"
        # In a wider grid non-diagonal seats exist: (0,0) and (0,2) are legal.
        engine_ok = generate_seating(make_request({"A": 2}, [rect_hall("H", 2, 3)], Policy(block_same_batch_diagonal=True)))
        assert engine_ok.status == "valid"
        placed = {(a.row, a.col) for a in engine_ok.assignments}
        assert all(abs(r1 - r2) + abs(c1 - c2) > 1 for (r1, c1), (r2, c2) in itertools.combinations(placed, 2))


class TestDuplicatesAndIntegrity:
    def test_duplicate_seat_detected(self):
        students = make_students({"A": 2})
        hall = rect_hall("H", 2, 2)
        allocation = {
            students[0].student_id: ("H", 0, 0),
            students[1].student_id: ("H", 0, 0),
        }
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert any(i.code == "duplicate_seat_assignment" for i in result.issues)

    def test_duplicate_student_detected(self):
        students = make_students({"A": 2})
        hall = rect_hall("H", 2, 2)
        allocation = [
            (students[0].student_id, ("H", 0, 0)),
            (students[0].student_id, ("H", 1, 1)),
        ]
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert not result.is_valid
        assert any(i.code == "duplicate_student_assignment" for i in result.issues)

    def test_blocked_seat_rejection(self):
        students = make_students({"A": 1})
        hall = rect_hall("H", 2, 2, {(0, 0)})
        allocation = {students[0].student_id: ("H", 0, 0)}
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert any(i.code == "blocked_seat_allocated" for i in result.issues)

    def test_unknown_seat_rejection(self):
        students = make_students({"A": 1})
        hall = rect_hall("H", 2, 2)
        allocation = {students[0].student_id: ("H", 5, 5)}
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert any(i.code == "seat_not_in_layout" for i in result.issues)

    def test_outside_roster_rejection(self):
        students = make_students({"A": 1})
        hall = rect_hall("H", 2, 2)
        allocation = {"GHOST-1": ("H", 0, 0)}
        result = validate_allocation(students, (hall,), Policy(), allocation)
        assert any(i.code == "student_not_in_roster" for i in result.issues)


class TestEmptySeatsAndPolicies:
    def test_empty_seats_allowed(self):
        result = generate_seating(make_request({"A": 3, "B": 3}, [rect_hall("H", 4, 6)]))
        assert result.status == "valid"
        assert result.stats["empty_seats"] == 18

    def test_no_adjacency_policy_fills_directly(self):
        policy = Policy(
            block_same_batch_horizontal=False,
            block_same_batch_vertical=False,
        )
        result = generate_seating(make_request({"A": 10, "B": 10}, [rect_hall("H", 4, 6)], policy))
        assert result.status == "valid"  # 20 <= 24 without adjacency rules

    def test_solver_and_backtracking_agree_on_tiny_cases(self):
        for counts, rows, cols in [
            ({"A": 2, "B": 2}, 2, 2),
            ({"A": 3, "B": 3}, 2, 3),
            ({"A": 2, "B": 1, "C": 1}, 2, 2),
            ({"A": 2}, 2, 2),
            ({"A": 2}, 1, 3),
            ({"A": 1, "B": 1}, 2, 2),
            ({"A": 3, "B": 1}, 2, 3),
        ]:
            hall = rect_hall("H", rows, cols)
            status, sol, _ = solve_batch_assignment((hall,), counts, Policy(), 5.0, prefer_cpsat=False)
            assert status in ("solution", "infeasible")
            expected = brute_force_feasible(counts, rows, cols)
            assert (status == "solution") == expected, f"Failed for {counts} in {rows}x{cols}"
            if expected:
                assert sol is not None
                assert len(sol) == sum(counts.values())

    def test_backtracking_diagonal_placement_with_empty_seats(self):
        # 2 same-batch students in 2x2 room must be placed diagonally at (0,0) and (1,1)
        hall = rect_hall("H", 2, 2)
        status, sol, solver_name = solve_batch_assignment((hall,), {"A": 2}, Policy(), 5.0, prefer_cpsat=False)
        assert status == "solution"
        assert sol is not None
        assert len(sol) == 2
        seats = list(sol.keys())
        # Both must be 'A', and must not share row or column
        assert sol[seats[0]] == "A" and sol[seats[1]] == "A"
        assert seats[0][1] != seats[1][1] or seats[0][2] != seats[1][2]
        # Seats must not be adjacent
        assert abs(seats[0][1] - seats[1][1]) + abs(seats[0][2] - seats[1][2]) > 1


class TestUnevenGrids:
    def test_uneven_3x5_partitions(self):
        # 3x5 = 15 seats: partitions 8 and 7
        result = generate_seating(make_request({"A": 8, "B": 7}, [rect_hall("H", 3, 5)]))
        assert result.status == "valid"
        assert result.validation.is_valid

    def test_uneven_grid_partition_limit(self):
        # 3x5: larger partition = 8; 9 same-class students cannot fit
        result = generate_seating(make_request({"A": 9, "B": 6}, [rect_hall("H", 3, 5)]))
        assert result.status == "infeasible"

    def test_single_column(self):
        result = generate_seating(make_request({"A": 2, "B": 2}, [rect_hall("H", 4, 1)]))
        assert result.status == "valid"

    def test_single_row(self):
        result = generate_seating(make_request({"A": 3, "B": 3}, [rect_hall("H", 1, 6)]))
        assert result.status == "valid"
