/**
 * Toggle handlers for SMC/ICT and Session Zone indicators. The actual
 * detection logic runs server-side (backend/indicators/*.py); this module
 * just fetches marker data and feeds it to MarkersModule.
 */
const IndicatorsModule = (() => {
  let smcOn = false;
  let sessionOn = false;

  async function refresh() {
    const tf = ChartModule.getTimeframe();

    const smcMarkers = smcOn ? (await API.getSmcMarkers(tf)).markers : [];
    const sessionMarkers = sessionOn ? (await API.getSessionMarkers(tf)).markers : [];

    MarkersModule.setSmc(smcMarkers);
    MarkersModule.setSession(sessionMarkers);
    MarkersModule.refresh();
  }

  function toggle(name) {
    if (name === "smc") {
      smcOn = !smcOn;
      document.getElementById("tgSmc").classList.toggle("on", smcOn);
      document.getElementById("chipSmc").classList.toggle("on", smcOn);
    }
    if (name === "session") {
      sessionOn = !sessionOn;
      document.getElementById("tgSession").classList.toggle("on", sessionOn);
      document.getElementById("chipSession").classList.toggle("on", sessionOn);
    }
    refresh();
  }

  document.querySelectorAll(".ind-item").forEach((el) => {
    el.addEventListener("click", () => toggle(el.dataset.ind));
  });
  document.getElementById("chipSmc").addEventListener("click", () => toggle("smc"));
  document.getElementById("chipSession").addEventListener("click", () => toggle("session"));

  return { refresh };
})();
