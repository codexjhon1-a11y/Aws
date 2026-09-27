"""
Replay engine: lets the frontend "scrub" through history like TradingView's
bar-replay tool. Backend just tracks the current index per session; the
frontend drives the pace (play/pause/speed) and calls /step or /seek.
"""

from typing import List, Dict, Optional


class ReplaySession:
    def __init__(self):
        self.active: bool = False
        self.index: int = 0
        self.candles: List[Dict] = []

    def start(self, candles: List[Dict], start_ratio: float = 0.5) -> Dict:
        self.candles = candles
        self.active = True
        self.index = max(1, int(len(candles) * start_ratio))
        return self.state()

    def stop(self) -> Dict:
        self.active = False
        return self.state()

    def step(self, count: int = 1) -> Dict:
        if not self.active:
            raise ValueError("Replay is not active. Call /replay/start first.")
        self.index = min(self.index + count, len(self.candles) - 1)
        return self.state()

    def seek(self, index: int) -> Dict:
        if not self.active:
            raise ValueError("Replay is not active. Call /replay/start first.")
        self.index = max(0, min(index, len(self.candles) - 1))
        return self.state()

    def visible_candles(self) -> List[Dict]:
        if not self.active:
            return self.candles
        return self.candles[: self.index + 1]

    def current_price(self) -> Optional[float]:
        visible = self.visible_candles()
        return visible[-1]["close"] if visible else None

    def state(self) -> Dict:
        return {
            "active": self.active,
            "index": self.index,
            "total": len(self.candles),
            "price": self.current_price(),
            "finished": self.active and self.index >= len(self.candles) - 1,
        }


# one replay session per server process (fine for a single-user backtester;
# key by session/user id in `sessions: Dict[str, ReplaySession]` if you add auth)
replay_session = ReplaySession()
