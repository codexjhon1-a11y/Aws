"""
Very simplified Smart Money Concepts / ICT style swing detector.
Flags a candle as a swing high (potential BOS up) or swing low (potential
CHoCH down) when it's the highest/lowest point within a symmetric window.

This is intentionally simple — good enough to visualize market structure,
not a production ICT engine. Swap the logic here if you want proper
order-block / fair-value-gap / liquidity-sweep detection later.
"""

from typing import List, Dict
from backend.core.config import SMC_PIVOT_WINDOW


def compute_smc_swings(candles: List[Dict], window: int = SMC_PIVOT_WINDOW) -> List[Dict]:
    markers = []
    n = len(candles)

    for i in range(window, n - window):
        slice_ = candles[i - window:i + window + 1]
        c = candles[i]

        if c["high"] == max(x["high"] for x in slice_):
            markers.append({
                "time": c["time"],
                "position": "aboveBar",
                "color": "#a78bfa",
                "shape": "circle",
                "text": "BOS↑",
            })
        elif c["low"] == min(x["low"] for x in slice_):
            markers.append({
                "time": c["time"],
                "position": "belowBar",
                "color": "#a78bfa",
                "shape": "circle",
                "text": "CHoCH↓",
            })

    return markers
