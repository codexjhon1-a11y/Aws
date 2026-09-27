/**
 * Drawing tools. Purely client-side (no need to round-trip drawings through
 * the backend) — reads clicks off ChartModule.chart and draws directly onto
 * ChartModule.candleSeries.
 */
const ToolsModule = (() => {
  const { chart, candleSeries } = ChartModule;

  let activeTool = "cursor";
  let clickBuffer = [];
  let drawnSeries = [];
  let priceLines = [];
  let hlMarkers = [];

  function setActiveTool(tool) {
    activeTool = tool;
    clickBuffer = [];
  }

  function getHlMarkers() {
    return hlMarkers;
  }

  function clearAll() {
    drawnSeries.forEach((s) => chart.removeSeries(s));
    drawnSeries = [];
    priceLines.forEach((pl) => candleSeries.removePriceLine(pl));
    priceLines = [];
    hlMarkers = [];
  }

  function drawTrendline(p1, p2) {
    const line = chart.addLineSeries({
      color: "#d4af37", lineWidth: 2, priceLineVisible: false, lastValueVisible: false,
    });
    const pts = [p1, p2].sort((a, b) => a.time - b.time);
    line.setData(pts.map((p) => ({ time: p.time, value: p.price })));
    drawnSeries.push(line);
  }

  function drawFibonacci(p1, p2) {
    const hi = Math.max(p1.price, p2.price);
    const lo = Math.min(p1.price, p2.price);
    const diff = hi - lo;
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    const colors = ["#6b7684", "#a78bfa", "#3b82f6", "#d4af37", "#0ecb81", "#f6465d", "#6b7684"];

    levels.forEach((lv, i) => {
      const lvlPrice = hi - diff * lv;
      const pl = candleSeries.createPriceLine({
        price: lvlPrice, color: colors[i], lineWidth: 1,
        lineStyle: LightweightCharts.LineStyle.Dotted,
        axisLabelVisible: true, title: `Fib ${(lv * 100).toFixed(1)}%`,
      });
      priceLines.push(pl);
    });
  }

  function drawHorizontalLine(price) {
    const pl = candleSeries.createPriceLine({
      price, color: "#3b82f6", lineWidth: 1,
      lineStyle: LightweightCharts.LineStyle.Dashed,
      axisLabelVisible: true, title: `H-Line ${price.toFixed(2)}`,
    });
    priceLines.push(pl);
  }

  chart.subscribeClick((param) => {
    if (activeTool === "cursor" || !param.point || !param.time) return;
    const price = candleSeries.coordinateToPrice(param.point.y);
    if (price === null) return;

    if (activeTool === "hline") {
      drawHorizontalLine(price);
      return;
    }

    if (activeTool === "high" || activeTool === "low") {
      hlMarkers.push({
        time: param.time,
        position: activeTool === "high" ? "aboveBar" : "belowBar",
        color: activeTool === "high" ? "#f6465d" : "#0ecb81",
        shape: activeTool === "high" ? "arrowDown" : "arrowUp",
        text: activeTool === "high" ? "H" : "L",
      });
      MarkersModule.refresh();
      return;
    }

    if (activeTool === "trend" || activeTool === "fib") {
      clickBuffer.push({ time: param.time, price });
      if (clickBuffer.length === 2) {
        if (activeTool === "trend") drawTrendline(clickBuffer[0], clickBuffer[1]);
        if (activeTool === "fib") drawFibonacci(clickBuffer[0], clickBuffer[1]);
        clickBuffer = [];
      }
    }
  });

  // --- toolbar wiring ---
  document.getElementById("toolbar").addEventListener("click", (e) => {
    const btn = e.target.closest(".tool-btn");
    if (!btn || btn.id === "clearTool") return;
    document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    setActiveTool(btn.dataset.tool);
    document.getElementById("toolHint").textContent = "Tool: " + btn.title;
  });

  document.getElementById("clearTool").addEventListener("click", () => {
    clearAll();
    MarkersModule.refresh();
  });

  return { getHlMarkers, clearAll };
})();
