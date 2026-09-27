from fastapi import APIRouter, HTTPException

from backend.core.config import AVAILABLE_TIMEFRAMES
from backend.data.generator import market_data
from backend.indicators.smc import compute_smc_swings
from backend.indicators.session import compute_session_markers

router = APIRouter(prefix="/api/indicators", tags=["indicators"])


def _candles_for(tf: str):
    if tf not in AVAILABLE_TIMEFRAMES:
        raise HTTPException(400, f"Unknown timeframe '{tf}'.")
    return market_data.candles(AVAILABLE_TIMEFRAMES[tf])


@router.get("/smc")
def get_smc(tf: str = "30m"):
    candles = _candles_for(tf)
    return {"markers": compute_smc_swings(candles)}


@router.get("/session")
def get_session(tf: str = "30m"):
    candles = _candles_for(tf)
    return {"markers": compute_session_markers(candles)}
