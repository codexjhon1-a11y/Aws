/**
 * Owns the lightweight-charts instance and the candlestick series.
 * Other modules (tools.js, indicators.js, replay.js, trading.js) read/write
 * through the small `ChartModule` API instead of touching `chart` directly.
 */
const ChartModule = (() => {
  const chartEl = document.getElementById("chart");

  const chart = LightweightCharts.createChart(chartEl, {
    layout: { background: { color: "#0f151b" }, textColor: "#c9d1d9" },
    grid: { vertLines: { color: "#1b232c" }, horzLines: { color: "#1b232c" } },
    timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#232d38" },
    rightPriceScale: { borderColor: "#232d38" },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
  });

  new ResizeObserver(() =>
    chart.applyOptions({ width: chartEl.clientWidth, height: chartEl.clientHeight })
  ).observe(chartEl);

  const candleSeries = chart.addCandlestickSeries({
    upColor: "#0ecb81", downColor: "#f6465d",
    borderUpColor: "#0ecb81", borderDownColor: "#f6465d",
    wickUpColor: "#0ecb81", wickDownColor: "#f6465d",
  });

  let currentTF = "30m";
  let fullData = [];

  function setData(candles) {
    fullData = candles;
    candleSeries.setData(candles);
  }

  function updateLast(candle) {
    candleSeries.update(candle);
  }

  function getData() {
    return fullData;
  }

  function getTimeframe() {
    return currentTF;
  }

  function setTimeframe(tf) {
    currentTF = tf;
  }

  return {
    chart,
    candleSeries,
    setData,
    updateLast,
    getData,
    getTimeframe,
    setTimeframe,
  };
})();
