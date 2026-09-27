from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from backend.core.config import AVAILABLE_TIMEFRAMES
from backend.data.generator import market_data
from backend.replay.engine import replay_session

router = APIRouter(prefix="/api/replay", tags=["replay"])


class StartRequest(BaseModel):
    tf: str = "30m"
    start_ratio: float = 0.5  # 0.5 = begin replay halfway through history


class SeekRequest(BaseModel):
    index: int


class StepRequest(BaseModel):
    count: int = 1


@router.post("/start")
def start_replay(body: StartRequest):
    if body.tf not in AVAILABLE_TIMEFRAMES:
        raise HTTPException(400, f"Unknown timeframe '{body.tf}'.")
    candles = market_data.candles(AVAILABLE_TIMEFRAMES[body.tf])
    state = replay_session.start(candles, body.start_ratio)
    return {**state, "candles": replay_session.visible_candles()}


@router.post("/stop")
def stop_replay():
    return replay_session.stop()


@router.post("/step")
def step_replay(body: StepRequest):
    try:
        state = replay_session.step(body.count)
    except ValueError as e:
        raise HTTPException(400, str(e))
    latest_candle = replay_session.candles[replay_session.index]
    return {**state, "latest_candle": latest_candle}


@router.post("/seek")
def seek_replay(body: SeekRequest):
    try:
        state = replay_session.seek(body.index)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {**state, "candles": replay_session.visible_candles()}


@router.get("/state")
def get_replay_state():
    return replay_session.state()
