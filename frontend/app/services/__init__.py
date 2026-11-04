"""Backend Domain Services Package.

Scalable service layer separating database persistence and business calculations
from HTTP routing and request parsing.
"""

from .dashboard_service import compute_dashboard_metrics, get_default_dashboard_stats
from .math_service import calculate_grid_capacity, construct_checkerboard_allocation
from .timetable_parser import parse_timetable_workbook

__all__ = [
    "compute_dashboard_metrics",
    "get_default_dashboard_stats",
    "calculate_grid_capacity",
    "construct_checkerboard_allocation",
    "parse_timetable_workbook",
]
