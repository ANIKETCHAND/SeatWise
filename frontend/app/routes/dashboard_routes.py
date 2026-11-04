"""Routes: dynamic dashboard data & university metrics."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from ..auth import AuthContext, require_authenticated
from ..services.dashboard_service import compute_dashboard_metrics

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats", summary="Get dashboard metrics and statistics")
def get_dashboard_stats(auth: AuthContext = Depends(require_authenticated)) -> dict:
    """Return aggregated live stats and chart distributions for the SeatWise university dashboard."""
    return compute_dashboard_metrics()
