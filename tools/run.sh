#!/usr/bin/env bash
# Run from the project root: bash tools/run.sh
set -e
cd "$(dirname "$0")/.."
pip install -r requirements.txt --break-system-packages 2>/dev/null || pip install -r requirements.txt
uvicorn backend.main:app --reload --port 8000
