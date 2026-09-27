/**
 * Buy/Sell buttons + open positions panel. All P&L math happens server-side
 * (backend/trading/engine.py) — this module just triggers requests and
 * renders whatever the backend returns.
 */
const TradingModule = (() => {
  const buyBtn = document.getElementById("buyBtn");
  const sellBtn = document.getElementById("sellBtn");
  const lotInput = document.getElementById("lotSize");
  const posList = document.getElementById("posList");

  async function open(direction) {
    const lot = parseFloat(lotInput.value) || 0.1;
    const tf = ChartModule.getTimeframe();
    await API.openTrade(direction, lot, tf);
    await refreshPositions();
  }

  async function close(id) {
    const tf = ChartModule.getTimeframe();
    await API.closeTrade(id, tf);
    await refreshPositions();
  }
  // exposed for the inline onclick handlers rendered below
  window.TradingClose = close;

  async function refreshPositions() {
    const tf = ChartModule.getTimeframe();
    const res = await API.listPositions(tf);
    render(res.positions);
    updateTradeMarkers(res.positions);
  }

  function render(positions) {
    if (!positions.length) {
      posList.innerHTML = '<div style="color:var(--muted); font-size:11.5px;">No open positions</div>';
      return;
    }
    posList.innerHTML = positions
      .map(
        (p) => `
      <div class="pos-item" data-id="${p.id}">
        <div class="row">
          <span class="${p.direction === "BUY" ? "dir-buy" : "dir-sell"}">${p.direction} ${p.lot}</span>
          <span class="close-x" onclick="TradingClose(${p.id})">✕ close</span>
        </div>
        <div class="row">
          <span>Entry: ${p.entry.toFixed(2)}</span>
          <span class="${p.pnl >= 0 ? "pnl-pos" : "pnl-neg"}">${p.pnl >= 0 ? "+" : ""}${p.pnl.toFixed(2)}</span>
        </div>
      </div>`
      )
      .join("");
  }

  function updateTradeMarkers(positions) {
    const markers = positions.map((p) => ({
      time: p.time,
      position: p.direction === "BUY" ? "belowBar" : "aboveBar",
      color: p.direction === "BUY" ? "#0ecb81" : "#f6465d",
      shape: p.direction === "BUY" ? "arrowUp" : "arrowDown",
      text: `${p.direction} @${p.entry.toFixed(2)}`,
    }));
    MarkersModule.setTrades(markers);
    MarkersModule.refresh();
  }

  buyBtn.addEventListener("click", () => open("BUY"));
  sellBtn.addEventListener("click", () => open("SELL"));

  return { refreshPositions };
})();
