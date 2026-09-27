// ---- Tools: Long/Short position tool, Trend Line, Rectangle ----

let activeTool = null;
let placedTool = null;
let dragging = null;
let lastToolResult = null;

const overlay = document.getElementById('toolOverlay');
const drawOverlay = document.getElementById('drawOverlay');

const longBtn = document.getElementById('longToolBtn');
const shortBtn = document.getElementById('shortToolBtn');
const trendLineBtn = document.getElementById('trendLineBtn');
const rectBtn = document.getElementById('rectBtn');
const fvgBtn = document.getElementById('fvgBtn');

let trendLineArmed = false;
let rectArmed = false;
let trendLines = [];
let rectangles = [];
let pendingTrendPoint = null;
let pendingRectPoint = null;
let fvgVisible = false;
let fvgList = [];

function deactivateAllTools() {
  activeTool = null;
  trendLineArmed = false;
  rectArmed = false;
  pendingTrendPoint = null;
  pendingRectPoint = null;
  longBtn.classList.remove('active');
  shortBtn.classList.remove('active');
  trendLineBtn.classList.remove('active');
  rectBtn.classList.remove('active');
  if (typeof replayBtn !== 'undefined') replayBtn.classList.remove('active');
  if (typeof replayArmed !== 'undefined') replayArmed = false;
}

longBtn.addEventListener('click', () => {
  const turningOn = activeTool !== 'long';
  deactivateAllTools();
  if (turningOn) {
    activeTool = 'long';
    longBtn.classList.add('active');
  }
});

shortBtn.addEventListener('click', () => {
  const turningOn = activeTool !== 'short';
  deactivateAllTools();
  if (turningOn) {
    activeTool = 'short';
    shortBtn.classList.add('active');
  }
});

trendLineBtn.addEventListener('click', () => {
  const turningOn = !trendLineArmed;
  deactivateAllTools();
  if (turningOn) {
    trendLineArmed = true;
    trendLineBtn.classList.add('active');
  }
});

rectBtn.addEventListener('click', () => {
  const turningOn = !rectArmed;
  deactivateAllTools();
  if (turningOn) {
    rectArmed = true;
    rectBtn.classList.add('active');
  }
});

fvgBtn.addEventListener('click', () => {
  fvgVisible = !fvgVisible;
  fvgBtn.classList.toggle('active', fvgVisible);
  redrawFVGs();
  if (typeof saveState === 'function') saveState();
});

// ---- Dispatcher called from app.js's chart click handler ----
function handleToolClick(param) {
  if (trendLineArmed) { handleTrendLineClick(param); return; }
  if (rectArmed) { handleRectClick(param); return; }
  if (!activeTool || !param.point) return;

  const price = candleSeries.coordinateToPrice(param.point.y);
  if (price === null) return;

  placedTool = activeTool === 'long'
    ? { type: 'long', entry: price, stop: price * 0.995, target: price * 1.01 }
    : { type: 'short', entry: price, stop: price * 1.005, target: price * 0.99 };

  activeTool = null;
  longBtn.classList.remove('active');
  shortBtn.classList.remove('active');

  buildToolOverlay();
  submitToolToBackend();
  if (typeof saveState === 'function') saveState();
}

// ---- Long/Short position box ----
function buildToolOverlay() {
  overlay.innerHTML = '';
  if (!placedTool) return;

  ['entry', 'stop', 'target'].forEach(key => {
    const line = document.createElement('div');
    line.className = `tool-line ${key}`;
    line.dataset.key = key;
    line.addEventListener('mousedown', e => { dragging = key; e.preventDefault(); });
    line.addEventListener('touchstart', () => { dragging = key; }, { passive: true });
    overlay.appendChild(line);

    const label = document.createElement('div');
    label.className = `tool-label ${key}`;
    label.dataset.key = key;
    overlay.appendChild(label);
  });

  const profitZone = document.createElement('div');
  profitZone.className = 'tool-zone profit';
  profitZone.dataset.zone = 'profit';
  overlay.appendChild(profitZone);

  const lossZone = document.createElement('div');
  lossZone.className = 'tool-zone loss';
  lossZone.dataset.zone = 'loss';
  overlay.appendChild(lossZone);

  const badge = document.createElement('div');
  badge.id = 'rrBadge';
  overlay.appendChild(badge);

  redrawTool();
}

function redrawTool() {
  if (!placedTool) return;
  const entryY = candleSeries.priceToCoordinate(placedTool.entry);
  const stopY = candleSeries.priceToCoordinate(placedTool.stop);
  const targetY = candleSeries.priceToCoordinate(placedTool.target);
  if (entryY === null || stopY === null || targetY === null) return;

  positionLine('entry', entryY, placedTool.entry);
  positionLine('stop', stopY, placedTool.stop);
  positionLine('target', targetY, placedTool.target);

  const profitTop = placedTool.type === 'long' ? targetY : entryY;
  const profitBottom = placedTool.type === 'long' ? entryY : targetY;
  const lossTop = placedTool.type === 'long' ? entryY : stopY;
  const lossBottom = placedTool.type === 'long' ? stopY : entryY;

  positionZone('profit', profitTop, profitBottom);
  positionZone('loss', lossTop, lossBottom);

  const badge = document.getElementById('rrBadge');
  if (badge) {
    // Show the backend's R:R once it responds; until then (or if the
    // backend call fails) compute it locally so the readout never blanks.
    const rr = lastToolResult ? lastToolResult.riskRewardRatio : localRiskReward(placedTool);
    badge.textContent = `${placedTool.type.toUpperCase()}  R:R ${isFinite(rr) ? rr.toFixed(2) : '-'}`;
  }
}

function localRiskReward(tool) {
  const risk = Math.abs(tool.entry - tool.stop);
  const reward = Math.abs(tool.target - tool.entry);
  return risk === 0 ? Infinity : reward / risk;
}

function positionLine(key, y, price) {
  const line = overlay.querySelector(`.tool-line[data-key="${key}"]`);
  const label = overlay.querySelector(`.tool-label[data-key="${key}"]`);
  if (line) line.style.top = `${y}px`;
  if (label) {
    label.style.top = `${y}px`;
    label.textContent = `${key.toUpperCase()} ${price.toFixed(2)}`;
  }
}

function positionZone(zoneName, top, bottom) {
  const zone = overlay.querySelector(`.tool-zone[data-zone="${zoneName}"]`);
  if (!zone) return;
  zone.style.top = `${Math.min(top, bottom)}px`;
  zone.style.height = `${Math.abs(bottom - top)}px`;
}

window.addEventListener('mousemove', e => handleDragMove(e.clientY));
window.addEventListener('touchmove', e => {
  if (dragging && e.touches.length) handleDragMove(e.touches[0].clientY);
}, { passive: true });
window.addEventListener('mouseup', handleDragEnd);
window.addEventListener('touchend', handleDragEnd);

function handleDragMove(clientY) {
  if (!dragging || !placedTool) return;
  const rect = chartContainer.getBoundingClientRect();
  const price = candleSeries.coordinateToPrice(clientY - rect.top);
  if (price === null) return;
  placedTool[dragging] = price;
  redrawTool();
}

function handleDragEnd() {
  if (!dragging) return;
  dragging = null;
  submitToolToBackend();
  if (typeof saveState === 'function') saveState();
}

async function submitToolToBackend() {
  if (!placedTool) return;
  const res = await fetch('/api/tool', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(placedTool)
  });
  lastToolResult = await res.json();
  redrawTool();
}

// ---- Trend Line ----
function handleTrendLineClick(param) {
  if (!param.time || !param.point) return;
  const price = candleSeries.coordinateToPrice(param.point.y);
  if (price === null) return;
  if (!pendingTrendPoint) {
    pendingTrendPoint = { time: param.time, price };
  } else {
    trendLines.push({ p1: pendingTrendPoint, p2: { time: param.time, price } });
    pendingTrendPoint = null;
    trendLineArmed = false;
    trendLineBtn.classList.remove('active');
    redrawTrendLines();
    if (typeof saveState === 'function') saveState();
  }
}

function redrawTrendLines() {
  const old = drawOverlay.querySelectorAll('.user-trendline');
  old.forEach(el => el.remove());
  trendLines.forEach(line => {
    const x1 = chart.timeScale().timeToCoordinate(line.p1.time);
    const y1 = candleSeries.priceToCoordinate(line.p1.price);
    const x2 = chart.timeScale().timeToCoordinate(line.p2.time);
    const y2 = candleSeries.priceToCoordinate(line.p2.price);
    if (x1 === null || y1 === null || x2 === null || y2 === null) return;
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    el.setAttribute('class', 'user-trendline');
    el.setAttribute('x1', x1); el.setAttribute('y1', y1);
    el.setAttribute('x2', x2); el.setAttribute('y2', y2);
    el.setAttribute('stroke', '#ab47bc');
    el.setAttribute('stroke-width', '2');
    drawOverlay.appendChild(el);
  });
}

// ---- Rectangle ----
function handleRectClick(param) {
  if (!param.time || !param.point) return;
  const price = candleSeries.coordinateToPrice(param.point.y);
  if (price === null) return;
  if (!pendingRectPoint) {
    pendingRectPoint = { time: param.time, price };
  } else {
    rectangles.push({ p1: pendingRectPoint, p2: { time: param.time, price } });
    pendingRectPoint = null;
    rectArmed = false;
    rectBtn.classList.remove('active');
    redrawRectangles();
    if (typeof saveState === 'function') saveState();
  }
}

function redrawRectangles() {
  const old = drawOverlay.querySelectorAll('.user-rect');
  old.forEach(el => el.remove());
  rectangles.forEach(r => {
    const x1 = chart.timeScale().timeToCoordinate(r.p1.time);
    const x2 = chart.timeScale().timeToCoordinate(r.p2.time);
    const y1 = candleSeries.priceToCoordinate(r.p1.price);
    const y2 = candleSeries.priceToCoordinate(r.p2.price);
    if (x1 === null || x2 === null || y1 === null || y2 === null) return;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'user-rect');
    rect.setAttribute('x', Math.min(x1, x2));
    rect.setAttribute('y', Math.min(y1, y2));
    rect.setAttribute('width', Math.abs(x2 - x1));
    rect.setAttribute('height', Math.abs(y2 - y1));
    rect.setAttribute('fill', 'rgba(255,179,0,0.14)');
    rect.setAttribute('stroke', '#ffb300');
    rect.setAttribute('stroke-width', '1.5');
    drawOverlay.appendChild(rect);
  });
}

// ---- FVG (Fair Value Gap, SMC) ----
// 3-candle imbalance: bullish gap when candle[i].low > candle[i-2].high,
// bearish gap when candle[i].high < candle[i-2].low. Box extends until a
// later candle trades back into the gap ("filled"), else to the last candle.
function computeFVGs(data) {
  const list = [];
  for (let i = 2; i < data.length; i++) {
    const left = data[i - 2];
    const right = data[i];
    let type = null, top = null, bottom = null;
    if (right.low > left.high) { type = 'bull'; top = right.low; bottom = left.high; }
    else if (right.high < left.low) { type = 'bear'; top = left.low; bottom = right.high; }
    if (!type) continue;

    let endTime = data[data.length - 1].time;
    for (let j = i + 1; j < data.length; j++) {
      const c = data[j];
      const filled = type === 'bull' ? c.low <= bottom : c.high >= top;
      if (filled) { endTime = c.time; break; }
    }
    list.push({ type, top, bottom, startTime: left.time, endTime });
  }
  return list;
}

function redrawFVGs() {
  const old = drawOverlay.querySelectorAll('.user-fvg');
  old.forEach(el => el.remove());
  if (!fvgVisible) return;

  fvgList.forEach(z => {
    const x1 = chart.timeScale().timeToCoordinate(z.startTime);
    const x2 = chart.timeScale().timeToCoordinate(z.endTime);
    const y1 = candleSeries.priceToCoordinate(z.top);
    const y2 = candleSeries.priceToCoordinate(z.bottom);
    if (x1 === null || x2 === null || y1 === null || y2 === null) return;
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('class', 'user-fvg');
    rect.setAttribute('x', Math.min(x1, x2));
    rect.setAttribute('y', Math.min(y1, y2));
    rect.setAttribute('width', Math.max(Math.abs(x2 - x1), 1));
    rect.setAttribute('height', Math.max(Math.abs(y2 - y1), 1));
    rect.setAttribute('fill', z.type === 'bull' ? 'rgba(0,188,212,0.25)' : 'rgba(255,112,67,0.25)');
    drawOverlay.appendChild(rect);
  });
}

// Called by app.js every time a timeframe (re)loads new candle data.
function onDataLoaded(data) {
  fvgList = computeFVGs(data);
  redrawFVGs();
}
