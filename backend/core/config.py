"""
Central config for the backtester.
Change these values to tune symbol behaviour, data length, timeframes etc.
"""

SYMBOL = "XAUUSD"
BASE_PRICE = 2360.0          # starting price for synthetic data
BASE_TIMEFRAME_MINUTES = 1    # smallest unit we generate, everything else aggregates from this
HISTORY_MINUTES = 60 * 24 * 5  # 5 days of 1-minute candles

AVAILABLE_TIMEFRAMES = {
    "5m": 5,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
}

# pip value approximation used for P&L calc (kept simple/synthetic)
PIP_VALUE_PER_LOT = 100.0

# swing pivot lookback/lookahead used by the SMC/ICT detector
SMC_PIVOT_WINDOW = 3

# UTC session opens used for session-zone markers
SESSIONS = [
    {"hour": 0, "label": "Asia", "color": "#fbbf24"},
    {"hour": 7, "label": "London", "color": "#38bdf8"},
    {"hour": 12, "label": "NY", "color": "#fb923c"},
]
