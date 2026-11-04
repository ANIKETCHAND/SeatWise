"""Core dataclasses for the allocation engine.

Mathematical model (Model 1):
- S = set of students (each carrying a batch/group label)
- T = set of usable seats
- An allocation is a function f: S -> T that must be injective.
"""

from __future__ import annotations

from dataclasses import dataclass, field


@dataclass(frozen=True, slots=True)
class Seat:
    """A physical seat inside a hall. row/col are 0-based grid coordinates."""

    hall_id: str
    row: int
    col: int
    seat_label: str
    usable: bool = True  # False when the seat is blocked/broken

    @property
    def key(self) -> tuple[str, int, int]:
        return (self.hall_id, self.row, self.col)


@dataclass(frozen=True, slots=True)
class Student:
    """A student participating in an allocation.

    group is the restricted batch key (e.g. "AIML-S3-A"); students of the
    same group are interchangeable from the adjacency constraint's point of
    view, which the solvers exploit.
    """

    student_id: str
    full_name: str
    roll_number: str
    group: str


@dataclass(frozen=True, slots=True)
class Hall:
    """A room hosting seats. rect_rows/rect_cols describe the nominal grid."""

    hall_id: str
    name: str
    rect_rows: int
    rect_cols: int
    seats: tuple[Seat, ...] = field(default=())


@dataclass(slots=True)
class Policy:
    """Seating policy configuration (Model 3 edge selection)."""

    block_same_batch_horizontal: bool = True
    block_same_batch_vertical: bool = True
    block_same_batch_diagonal: bool = False
    allow_empty_seats: bool = True
    allow_mixed_batch: bool = True

    @property
    def has_adjacency_constraints(self) -> bool:
        return (
            self.block_same_batch_horizontal
            or self.block_same_batch_vertical
            or self.block_same_batch_diagonal
        )


@dataclass(slots=True)
class SeatingRequest:
    """Everything the engine needs to produce an allocation."""

    students: tuple[Student, ...]
    halls: tuple[Hall, ...]
    policy: Policy = field(default_factory=Policy)
    solver_time_limit_seconds: float = 20.0


@dataclass(slots=True)
class SeatAssignment:
    """Result row: student -> seat."""

    student_id: str
    full_name: str
    roll_number: str
    group: str
    hall_id: str
    row: int
    col: int
    seat_label: str


@dataclass(slots=True)
class AllocationResult:
    """Outcome of a generation attempt.

    status semantics (the UI must surface these honestly):
    - valid:      an allocation was produced and passed independent validation
    - infeasible: mathematically proven impossible (e.g. pigeonhole)
    - unknown:    the solver could not determine feasibility within limits
    - invalid:    an allocation was produced but failed validation (engine bug)
    """

    status: str  # "valid" | "infeasible" | "unknown" | "invalid"
    assignments: tuple[SeatAssignment, ...] = field(default_factory=tuple)
    unallocated_students: tuple[str, ...] = field(default_factory=tuple)
    explanation: str = ""
    math_notes: tuple[str, ...] = field(default_factory=tuple)
    stats: dict = field(default_factory=dict)
    solver_name: str = ""
    solve_seconds: float = 0.0
    validation: object = None  # ValidationResult, set by the engine
