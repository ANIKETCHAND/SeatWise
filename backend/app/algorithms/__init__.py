"""SeatWise mathematical allocation engine.

Pure-Python modules with no database or web-framework dependencies:

- models:      core dataclasses (seats, students, halls, policy)
- adjacency:   grid graph construction (Model 3)
- independence: exact maximum independent set size via bipartite matching
- checkerboard: exact two-class construction on rectangular grids (Model 4)
- solver:      constraint solving (CP-SAT primary, backtracking fallback)
- validator:   independent mathematical validation of any allocation
- engine:      orchestration with honest status reporting
"""

from .models import Hall, Policy, Seat, Student, SeatingRequest, AllocationResult
from .validator import validate_allocation, ValidationResult, ValidationIssue
from .engine import generate_seating

__all__ = [
    "Hall",
    "Policy",
    "Seat",
    "Student",
    "SeatingRequest",
    "AllocationResult",
    "validate_allocation",
    "ValidationResult",
    "ValidationIssue",
    "generate_seating",
]
