import csv
import json
import os
import glob

DATA_DIR = "data"
OUT_DIR = "data/fvg_cache"

os.makedirs(OUT_DIR, exist_ok=True)

for path in sorted(glob.glob(os.path.join(DATA_DIR, "XAUUSD_*.csv"))):
    rows = []

    with open(path, newline="") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append({
                "time": r["Date"],
                "high": float(r["High"]),
                "low": float(r["Low"])
            })

    fvgs = []

    for i in range(2, len(rows)):
        left = rows[i - 2]
        right = rows[i]

        if right["low"] > left["high"]:
            typ = "bull"
            top = right["low"]
            bottom = left["high"]
        elif right["high"] < left["low"]:
            typ = "bear"
            top = left["low"]
            bottom = right["high"]
        else:
            continue

        end_time = rows[-1]["time"]

        for j in range(i + 1, len(rows)):
            c = rows[j]

            if typ == "bull":
                filled = c["low"] <= bottom
            else:
                filled = c["high"] >= top

            if filled:
                end_time = c["time"]
                break

        fvgs.append({
            "type": typ,
            "top": top,
            "bottom": bottom,
            "startTime": left["time"],
            "endTime": end_time
        })

    name = os.path.splitext(os.path.basename(path))[0]
    out = os.path.join(OUT_DIR, name + "_FVG.json")

    with open(out, "w") as f:
        json.dump(fvgs, f, separators=(",", ":"))

    print(f"{name}: {len(fvgs)} FVGs -> {out}")
