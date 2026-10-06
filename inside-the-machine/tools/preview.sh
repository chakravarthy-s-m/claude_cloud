#!/usr/bin/env bash
# Render preview stills for one composition and tile them into a contact sheet.
# usage: tools/preview.sh <outdir> <compId> <f1,f2,...> [scale]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?outdir}"
COMP="${2:?comp}"
FRAMES="${3:?frames}"
SCALE="${4:-0.5}"
mkdir -p "$OUT"
find "${OUT:?}" -maxdepth 1 -name "${COMP}-*.png" -delete
STILLS_DIR="$OUT" node tools/stills.mjs "${COMP}:${FRAMES}" --scale="$SCALE" 2>&1 | grep -E "png|done|Error|error" | grep -v "^$" | tail -3
montage "$OUT/${COMP}"-*.png -tile 4x -geometry 640x360+4+4 -background '#111' "$OUT/${COMP}-sheet.jpg"
echo "$OUT/${COMP}-sheet.jpg"
