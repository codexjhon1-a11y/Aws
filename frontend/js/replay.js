/**
 * Drives the backend replay session (backend/replay/engine.py). Backend
 * tracks the index; this module owns the play/pause interval timer and
 * pushes new candles onto the chart as they "arrive".
 */
const ReplayModule = (() => {
  const replayBtn = document.getElementById("replayBtn");
  const playBtn = document.getElementById("playBtn");
  const seek = document.getElementById("seek");
  const speedSelect = document.getElementById("speedSelect");

  let isReplaying = false;
  let isPlaying = false;
  let timer = null;

  async function start() {
    const tf = ChartModule.getTimeframe();
    const res = await API.startReplay(tf, 0.5);

    isReplaying = true;
    replayBtn.classList.add("active");
    replayBtn.textContent = "■ Exit Replay";
    seek.disabled = false;
    seek.max = res.total - 1;
    seek.value = res.index;

    ChartModule.setData(res.candles);
    MarkersModule.refresh();
    TradingModule.refreshPositions();
  }

  async function stop() {
    await API.stopReplay();
    isReplaying = false;
    isPlaying = false;
    clearInterval(timer);
    playBtn.textContent = "▶";
    replayBtn.classList.remove("active");
    replayBtn.textContent = "↻ Replay";
    seek.disabled = true;

    const tf = ChartModule.getTimeframe();
    const res = await API.getCandles(tf);
    ChartModule.setData(res.candles);
    MarkersModule.refresh();
    TradingModule.refreshPositions();
    PriceModule.refresh();
  }

  function tick() {
    clearInterval(timer);
    timer = setInterval(async () => {
      const state = await API.stepReplay(1);
      ChartModule.updateLast(state.latest_candle);
      seek.value = state.index;
      PriceModule.setFromCandle(state.latest_candle);
      TradingModule.refreshPositions();

      if (state.finished) {
        clearInterval(timer);
        isPlaying = false;
        playBtn.textContent = "▶";
      }
    }, +speedSelect.value);
  }

  replayBtn.addEventListener("click", () => (isReplaying ? stop() : start()));

  playBtn.addEventListener("click", () => {
    if (!isReplaying) return;
    isPlaying = !isPlaying;
    playBtn.textContent = isPlaying ? "❚❚" : "▶";
    if (isPlaying) tick();
    else clearInterval(timer);
  });

  speedSelect.addEventListener("change", () => {
    if (isPlaying) tick();
  });

  seek.addEventListener("input", async () => {
    const state = await API.seekReplay(+seek.value);
    ChartModule.setData(state.candles);
    MarkersModule.refresh();
    PriceModule.setFromCandle(state.candles[state.candles.length - 1]);
    TradingModule.refreshPositions();
  });

  function isActive() {
    return isReplaying;
  }

  return { start, stop, isActive };
})();

document.getElementById("resetBtn").addEventListener("click", async () => {
  await ReplayModule.stop();
  document.querySelectorAll(".tool-btn").forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-tool="cursor"]').classList.add("active");
  ToolsModule.clearAll();
  MarkersModule.refresh();
});
