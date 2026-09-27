/**
 * Bootstraps the app: loads the initial candle set and wires up the
 * timeframe buttons. Everything else (tools, indicators, replay, trading)
 * is already self-wired in its own module.
 */
const App = (() => {
  async function loadTimeframe(tf) {
    ChartModule.setTimeframe(tf);
    const res = await API.getCandles(tf);
    ChartModule.setData(res.candles);
    PriceModule.refresh();
    IndicatorsModule.refresh();
    TradingModule.refreshPositions();
  }

  function wireTimeframeButtons() {
    document.getElementById("tfGroup").addEventListener("click", (e) => {
      const btn = e.target.closest(".tf-btn");
      if (!btn) return;
      document.querySelectorAll(".tf-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      loadTimeframe(btn.dataset.tf);
    });
  }

  async function init() {
    wireTimeframeButtons();
    await loadTimeframe(ChartModule.getTimeframe()); // defaults to "30m"
  }

  return { init };
})();

App.init();
