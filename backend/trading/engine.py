"""
Simple paper-trading engine: open/close BUY/SELL positions against the
current synthetic price and compute floating P&L. Spread is a flat 0.25
(configurable) applied on entry, same as most demo XAUUSD feeds.
"""

from itertools import count
from typing import List, Dict, Literal

from backend.core.config import PIP_VALUE_PER_LOT

SPREAD = 0.25
Direction = Literal["BUY", "SELL"]

_id_counter = count(1)


class Position:
    def __init__(self, direction: Direction, lot: float, market_price: float, time: int):
        self.id = next(_id_counter)
        self.direction = direction
        self.lot = lot
        self.entry = market_price + (SPREAD if direction == "BUY" else -SPREAD)
        self.time = time

    def pnl(self, current_price: float) -> float:
        diff = (current_price - self.entry) if self.direction == "BUY" else (self.entry - current_price)
        return round(diff * self.lot * PIP_VALUE_PER_LOT, 2)

    def to_dict(self, current_price: float) -> Dict:
        return {
            "id": self.id,
            "direction": self.direction,
            "lot": self.lot,
            "entry": round(self.entry, 2),
            "time": self.time,
            "pnl": self.pnl(current_price),
        }


class TradingEngine:
    def __init__(self):
        self.positions: List[Position] = []

    def open(self, direction: Direction, lot: float, market_price: float, time: int) -> Position:
        pos = Position(direction, lot, market_price, time)
        self.positions.append(pos)
        return pos

    def close(self, position_id: int) -> bool:
        before = len(self.positions)
        self.positions = [p for p in self.positions if p.id != position_id]
        return len(self.positions) < before

    def close_all(self):
        self.positions = []

    def snapshot(self, current_price: float) -> List[Dict]:
        return [p.to_dict(current_price) for p in self.positions]

    def total_pnl(self, current_price: float) -> float:
        return round(sum(p.pnl(current_price) for p in self.positions), 2)


# one engine per server process — same note as replay_session re: multi-user
trading_engine = TradingEngine()
