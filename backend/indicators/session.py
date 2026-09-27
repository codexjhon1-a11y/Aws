"""
Marks the first candle of each trading session (Asia / London / New York)
per UTC calendar day, based on the hours configured in core/config.py.
"""

from datetime import datetime, timezone
from typing import List, Dict
from backend.core.config import SESSIONS


def compute_session_markers(candles: List[Dict]) -> List[Dict]:
    markers = []
    seen = set()

    for c in candles:
        dt = datetime.fromtimestamp(c["time"], tz=timezone.utc)
        day_key = f"{dt.year}-{dt.month}-{dt.day}"

        for session in SESSIONS:
            key = day_key + session["label"]
            if dt.hour == session["hour"] and key not in seen:
                seen.add(key)
                markers.append({
                    "time": c["time"],
                    "position": "inBar",
                    "color": session["color"],
                    "shape": "square",
                    "text": session["label"],
                })

    return markers
