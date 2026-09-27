"""
Generates synthetic 1-minute OHLC candles for XAUUSD and aggregates them
into any higher timeframe. Swap `generate_base_data` for a real data
loader (CSV / broker API) later without touching the rest of the app.
"""

import random
import time
from typing import List, Dict

from backend.core.config import BASE_PRICE, HISTORY_MINUTES


def generate_base_data(minutes: int = HISTORY_MINUTES, start_price: float = BASE_PRICE) -> List[Dict]:
    """Random-walk 1-minute candles. Deterministic-ish volatility, no seed pinned
    so every server restart gives a fresh session (call with a seed if you need
    reproducible backtests)."""
    data = []
    price = start_price
    t = int(time.time()) - minutes * 60
    t -= t % 60

    for _ in range(minutes):
        vol = 0.9
        open_ = price
        drift = (random.random() - 0.5) * vol
        close = open_ + drift
        high = max(open_, close) + random.random() * vol * 0.6
        low = min(open_, close) - random.random() * vol * 0.6
        data.append({
            "time": t,
            "open": round(open_, 2),
            "high": round(high, 2),
            "low": round(low, 2),
            "close": round(close, 2),
        })
        price = close
        t += 60

    return data


def aggregate(base_1m: List[Dict], minutes: int) -> List[Dict]:
    """Roll up 1-minute candles into `minutes`-sized OHLC bars."""
    out = []
    for i in range(0, len(base_1m), minutes):
        chunk = base_1m[i:i + minutes]
        if not chunk:
            continue
        out.append({
            "time": chunk[0]["time"],
            "open": chunk[0]["open"],
            "high": max(c["high"] for c in chunk),
            "low": min(c["low"] for c in chunk),
            "close": chunk[-1]["close"],
        })
    return out


class MarketData:
    """Holds the base dataset in memory for the life of the server process
    and serves aggregated views per timeframe."""

    def __init__(self):
        self.base_1m = generate_base_data()

    def candles(self, timeframe_minutes: int) -> List[Dict]:
        if timeframe_minutes <= 1:
            return self.base_1m
        return aggregate(self.base_1m, timeframe_minutes)

    def last_price(self, timeframe_minutes: int) -> float:
        candles = self.candles(timeframe_minutes)
        return candles[-1]["close"] if candles else BASE_PRICE


# single shared instance used across the app (simple in-memory "DB")
market_data = MarketData()
