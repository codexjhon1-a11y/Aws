/**
 * Updates the top-bar price ticker and the trade panel's buy/sell quote.
 * Fed either by live candle data (app.js) or replay ticks (replay.js).
 */
const PriceModule = (() => {
  const livePriceEl = document.getElementById("livePrice");
  const priceChangeEl = document.getElementById("priceChange");
  const tradePriceEl = document.getElementById("tradePrice");
  const sellPriceEl = document.getElementById("sellPrice");
  const buyPriceEl = document.getElementById("buyPrice");

  const SPREAD = 0.25;
  let prevClose = null;

  function paint(close) {
    if (prevClose !== null) {
      const change = close - prevClose;
      const pct = ((change / prevClose) * 100).toFixed(2);
      const color = change >= 0 ? "#0ecb81" : "#f6465d";
      livePriceEl.style.color = color;
      priceChangeEl.style.color = color;
      priceChangeEl.textContent = `${change >= 0 ? "+" : ""}${change.toFixed(2)} (${change >= 0 ? "+" : ""}${pct}%)`;
    }
    livePriceEl.textContent = close.toFixed(2);
    tradePriceEl.textContent = close.toFixed(2);
    sellPriceEl.textContent = (close - SPREAD).toFixed(2);
    buyPriceEl.textContent = (close + SPREAD).toFixed(2);
  }

  function setFromCandle(candle) {
    if (!candle) return;
    paint(candle.close);
    prevClose = candle.close;
  }

  async function refresh() {
    const tf = ChartModule.getTimeframe();
    const data = ChartModule.getData();
    if (!data.length) return;
    prevClose = data.length > 1 ? data[data.length - 2].close : data[data.length - 1].open;
    paint(data[data.length - 1].close);
  }

  return { setFromCandle, refresh };
})();
