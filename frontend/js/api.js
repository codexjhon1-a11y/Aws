/**
 * All backend calls live here so the rest of the frontend never touches
 * fetch() directly. Swap BASE_URL if you deploy backend separately.
 */
const API = (() => {
  const BASE_URL = ""; // same-origin, FastAPI serves the frontend too

  async function get(path) {
    const res = await fetch(BASE_URL + path);
    if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
    return res.json();
  }

  async function post(path, body) {
    const res = await fetch(BASE_URL + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`);
    return res.json();
  }

  return {
    getTimeframes: () => get("/api/market/timeframes"),
    getCandles: (tf) => get(`/api/market/candles?tf=${tf}`),
    getPrice: (tf) => get(`/api/market/price?tf=${tf}`),

    getSmcMarkers: (tf) => get(`/api/indicators/smc?tf=${tf}`),
    getSessionMarkers: (tf) => get(`/api/indicators/session?tf=${tf}`),

    startReplay: (tf, startRatio = 0.5) => post("/api/replay/start", { tf, start_ratio: startRatio }),
    stopReplay: () => post("/api/replay/stop"),
    stepReplay: (count = 1) => post("/api/replay/step", { count }),
    seekReplay: (index) => post("/api/replay/seek", { index }),
    getReplayState: () => get("/api/replay/state"),

    openTrade: (direction, lot, tf) => post("/api/trade/open", { direction, lot, tf }),
    closeTrade: (id, tf) => post(`/api/trade/close/${id}?tf=${tf}`),
    listPositions: (tf) => get(`/api/trade/positions?tf=${tf}`),
  };
})();
