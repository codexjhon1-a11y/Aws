from fastapi import APIRouter, HTTPException

from backend.core.config import AVAILABLE_TIMEFRAMES, SYMBOL
from backend.data.generator import market_data

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/timeframes")
def get_timeframes():
    return {"symbol": SYMBOL, "timeframes": list(AVAILABLE_TIMEFRAMES.keys())}


@router.get("/candles")
def get_candles(tf: str = "30m"):
    if tf not in AVAILABLE_TIMEFRAMES:
        raise HTTPException(400, f"Unknown timeframe '{tf}'. Use one of {list(AVAILABLE_TIMEFRAMES)}")
    minutes = AVAILABLE_TIMEFRAMES[tf]
    return {"symbol": SYMBOL, "timeframe": tf, "candles": market_data.candles(minutes)}


@router.get("/price")
def get_price(tf: str = "30m"):
    if tf not in AVAILABLE_TIMEFRAMES:
        raise HTTPException(400, f"Unknown timeframe '{tf}'.")
    minutes = AVAILABLE_TIMEFRAMES[tf]
    return {"symbol": SYMBOL, "price": market_data.last_price(minutes)}
