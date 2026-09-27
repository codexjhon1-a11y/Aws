from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
import time

from backend.core.config import AVAILABLE_TIMEFRAMES
from backend.data.generator import market_data
from backend.replay.engine import replay_session
from backend.trading.engine import trading_engine

router = APIRouter(prefix="/api/trade", tags=["trading"])


class OpenTradeRequest(BaseModel):
    direction: Literal["BUY", "SELL"]
    lot: float = 0.10
    tf: str = "30m"


def _current_price_and_time(tf: str):
    """Use the replay price/time if a replay is active, otherwise live last candle."""
    if replay_session.active:
        candle = replay_session.candles[replay_session.index]
        return candle["close"], candle["time"]

    if tf not in AVAILABLE_TIMEFRAMES:
        raise HTTPException(400, f"Unknown timeframe '{tf}'.")
    minutes = AVAILABLE_TIMEFRAMES[tf]
    candles = market_data.candles(minutes)
    last = candles[-1]
    return last["close"], last["time"]


@router.post("/open")
def open_trade(body: OpenTradeRequest):
    price, ts = _current_price_and_time(body.tf)
    pos = trading_engine.open(body.direction, body.lot, price, ts)
    return {"position": pos.to_dict(price)}


@router.post("/close/{position_id}")
def close_trade(position_id: int, tf: str = "30m"):
    ok = trading_engine.close(position_id)
    if not ok:
        raise HTTPException(404, "Position not found")
    return {"closed": position_id}


@router.get("/positions")
def list_positions(tf: str = "30m"):
    price, _ = _current_price_and_time(tf)
    return {
        "price": price,
        "positions": trading_engine.snapshot(price),
        "total_pnl": trading_engine.total_pnl(price),
    }
