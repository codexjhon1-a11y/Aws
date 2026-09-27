"""
Entry point.

Run with:
    uvicorn backend.main:app --reload --port 8000

Then open http://localhost:8000 in your browser.
"""

from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware

from backend.api import routes_market, routes_indicators, routes_replay, routes_trading

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIR = BASE_DIR / "frontend"

app = FastAPI(title="XAUUSD Backtester", version="1.0.0")

# wide-open CORS since this is a local single-user tool; tighten if you deploy it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_market.router)
app.include_router(routes_indicators.router)
app.include_router(routes_replay.router)
app.include_router(routes_trading.router)

# serve css/js as static assets
app.mount("/css", StaticFiles(directory=FRONTEND_DIR / "css"), name="css")
app.mount("/js", StaticFiles(directory=FRONTEND_DIR / "js"), name="js")


@app.get("/")
def serve_index():
    return FileResponse(FRONTEND_DIR / "index.html")
