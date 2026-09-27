/**
 * setMarkers() on lightweight-charts replaces the whole marker set each
 * call, so every module (tools/indicators/trading) that wants markers on
 * the chart contributes a getter here instead of calling setMarkers itself.
 */
const MarkersModule = (() => {
  let smcMarkers = [];
  let sessionMarkers = [];
  let tradeMarkers = [];

  function setSmc(markers) { smcMarkers = markers; }
  function setSession(markers) { sessionMarkers = markers; }
  function setTrades(markers) { tradeMarkers = markers; }

  function refresh() {
    const all = [
      ...ToolsModule.getHlMarkers(),
      ...smcMarkers,
      ...sessionMarkers,
      ...tradeMarkers,
    ].sort((a, b) => a.time - b.time);

    ChartModule.candleSeries.setMarkers(all);
  }

  return { setSmc, setSession, setTrades, refresh };
})();
