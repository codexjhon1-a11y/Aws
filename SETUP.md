# XAUUSD Backtester — Termux Setup (Version 1)

This is a strict V1: candlestick chart for XAUUSD on 5 timeframes (5M, 15M,
30M, 1H, 4H), each backed by its own separately-downloaded 2‑year CSV, plus
a Long Tool and a Short Tool (draggable entry/stop/target lines, like
TradingView's position tool) that a small C++ backend uses to compute
risk/reward. No buy/sell buttons, no indicators, no live trading.

---

## 0. A note on the data

There is no free API that gives 2 years of true, independently-recorded
XAUUSD candles for 5 separate intraday timeframes without a rate limit or a
paywall. The most practical free option is the Kaggle dataset **"XAU/USD
Gold Price Historical Data (2004–2026)"**, which ships one CSV **per
timeframe** (not resampled from each other) — exactly matching your "each
timeframe = its own dataset" requirement:
https://www.kaggle.com/datasets/novandraanugrah/xauusd-gold-price-historical-data-2004-2024

You need a free Kaggle account to download it. Steps 3 below cover this.

---

## 1. Install packages in Termux

```bash
pkg update -y && pkg upgrade -y
pkg install -y clang git curl unzip termux-api
termux-setup-storage
```

`termux-setup-storage` will prompt for a storage permission — allow it.
This lets Termux see your phone's normal Downloads folder at
`~/storage/downloads/`.

---

## 2. Create the project structure

```bash
mkdir -p ~/xauusd-backtester/{data,src,web}
cd ~/xauusd-backtester
```

(You'll copy in the actual source files from this project in step 5.)

---

## 3. Get the 2-year datasets (one file per timeframe)

1. On your phone, open a browser and log into (or create) a free account at
   kaggle.com.
2. Go to the dataset page:
   https://www.kaggle.com/datasets/novandraanugrah/xauusd-gold-price-historical-data-2004-2024
3. Open the file list and download these 5 files individually (each is its
   own original file, not derived from another) to your phone's normal
   Downloads folder:
   - `XAU_5m_data.csv`
   - `XAU_15m_data.csv`
   - `XAU_30m_data.csv`
   - `XAU_1h_data.csv`
   - `XAU_4h_data.csv`

4. Back in Termux, copy them into the project and rename to match what the
   backend expects:

```bash
cd ~/xauusd-backtester
cp ~/storage/downloads/XAU_5m_data.csv  data/XAUUSD_5M.csv
cp ~/storage/downloads/XAU_15m_data.csv data/XAUUSD_15M.csv
cp ~/storage/downloads/XAU_30m_data.csv data/XAUUSD_30M.csv
cp ~/storage/downloads/XAU_1h_data.csv  data/XAUUSD_1H.csv
cp ~/storage/downloads/XAU_4h_data.csv  data/XAUUSD_4H.csv
```

5. **Check the date column format** before trimming (the dataset's date
   format has varied between versions — could be `2024-09-26 00:00:00` or
   `2024.09.26 00:00:00`):

```bash
head -n 3 data/XAUUSD_1H.csv
```

6. Trim each file down to exactly the last 2 years. Replace `CUTOFF` below
   with today's date minus 2 years (today is 2026-09-26, so the cutoff is
   `2024-09-26`). This keeps the header row and only rows on/after the
   cutoff, and works whether the date uses `-` or `.` as separator:

```bash
CUTOFF="2024-09-26"
for f in data/XAUUSD_5M.csv data/XAUUSD_15M.csv data/XAUUSD_30M.csv data/XAUUSD_1H.csv data/XAUUSD_4H.csv; do
  head -n 1 "$f" > "$f.trimmed"
  tail -n +2 "$f" | awk -F',' -v OFS=',' -v cutoff="$CUTOFF" '
    { d = $1; gsub(/\./, "-", d); if (d >= cutoff) print $0 }
  ' >> "$f.trimmed"
  mv "$f.trimmed" "$f"
done
wc -l data/*.csv
```

If `head -n 3` in step 5 showed a layout this awk one-liner doesn't match
(e.g. separate `Date` and `Time` columns instead of one combined column),
adjust the field reference from `$1` to whichever column holds the date —
everything else in the command stays the same. The app's own CSV loader
(`src/data.cpp`) auto-detects the header layout at load time regardless, so
this trimming step is the only place the exact format matters.

---

## 4. Get the project source files

Copy `src/*.cpp`, `src/*.h`, and `web/*` from this project into
`~/xauusd-backtester/src/` and `~/xauusd-backtester/web/` respectively
(e.g. via `termux-setup-storage` + `cp` from Downloads, same as step 3, or
`git`/`scp` if you prefer). File contents are listed in full alongside this
guide.

---

## 5. Compile the C++ backend

```bash
cd ~/xauusd-backtester
clang++ -std=c++17 -O2 -o backtester \
  src/main.cpp src/data.cpp src/server.cpp src/long_tool.cpp src/short_tool.cpp
```

This produces a single binary, `backtester`, with no external dependencies.

---

## 6. Run it

```bash
cd ~/xauusd-backtester
./backtester
```

You should see:
```
XAUUSD backtester server running on http://127.0.0.1:8080
```

Open your phone's browser and go to **http://127.0.0.1:8080**.

- Tap a timeframe button (5M/15M/30M/1H/4H) to load that dataset's candles.
- Tap **Long Tool** or **Short Tool**, then tap a point on the chart to
  place it — three draggable lines appear (entry/stop/target) with a
  shaded profit/loss zone and a risk:reward readout, computed by the C++
  backend (`long_tool.cpp` / `short_tool.cpp`).
- Drag any of the three lines to adjust; the risk:reward updates on
  release.

Stop the server with `Ctrl+C` in Termux.

---

## Project structure recap

```
xauusd-backtester/
├── data/
│   ├── XAUUSD_5M.csv
│   ├── XAUUSD_15M.csv
│   ├── XAUUSD_30M.csv
│   ├── XAUUSD_1H.csv
│   └── XAUUSD_4H.csv
├── src/
│   ├── main.cpp        # entry point, starts the server
│   ├── data.h / data.cpp       # CSV loading + JSON serialization
│   ├── server.h / server.cpp   # minimal raw-socket HTTP server + routes
│   ├── long_tool.h / long_tool.cpp   # Long tool risk/reward math
│   └── short_tool.h / short_tool.cpp # Short tool risk/reward math
└── web/
    ├── index.html   # timeframe + tool buttons, chart container
    ├── style.css    # dark theme, tool overlay styling
    └── app.js       # chart rendering + Long/Short tool drag logic
```
