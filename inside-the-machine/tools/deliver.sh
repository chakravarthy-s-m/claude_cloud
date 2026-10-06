#!/usr/bin/env bash
# Delivery encodes from the master render.
#   out/<ep>-<slug>.mp4         master (CRF 18 segments, loudness-normalized AAC)
#   → out/<ep>-<slug>-1080p.mp4  share/YouTube upload (H.264 High, CRF 21, limited-range BT.709)
#   → out/<ep>-preview-720p.mp4  lightweight preview
#   → docs/<ep>-storyboard.jpg   16-frame contact sheet for the README
# usage: tools/deliver.sh [ep01]
set -euo pipefail
cd "$(dirname "$0")/.."
EP=${1:-ep01}
read -r SLUG NUM < <(python3 -c "import json;s=json.load(open('episodes/$EP/script.json'));print(s['slug'], s['id'][2:])")
TITLE=$(python3 -c "import json;print(json.load(open('episodes/$EP/script.json'))['title'])")
SUB=$(python3 -c "import json;print(json.load(open('episodes/$EP/script.json'))['subtitle'])")
MASTER="out/${EP}-${SLUG}.mp4"
VF="scale=in_range=pc:out_range=tv,format=yuv420p"
META=(-metadata title="INSIDE THE MACHINE — Ep ${NUM}: ${TITLE}" -metadata comment="${SUB}")

ffmpeg -y -loglevel error -stats -i "$MASTER" -map 0 \
  -c:v libx264 -preset slow -crf 21 -profile:v high -vf "$VF" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a copy -movflags +faststart "${META[@]}" "out/${EP}-${SLUG}-1080p.mp4"

ffmpeg -y -loglevel error -stats -i "$MASTER" -map 0 \
  -c:v libx264 -preset slow -crf 24 -profile:v high -vf "scale=1280:720:flags=lanczos,$VF" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 160k -movflags +faststart "${META[@]}" "out/${EP}-preview-720p.mp4"

# storyboard for the README: 16 frames, evenly spaced
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MASTER")
STEP=$(python3 -c "print(round((${DUR} - 24) / 16, 3))")
ffmpeg -y -loglevel error -ss 20 -i "$MASTER" -vf "fps=1/${STEP},scale=480:-1,tile=4x4:padding=4:color=0x05060d" -frames:v 1 -q:v 3 "docs/${EP}-storyboard.jpg"

ls -la out/${EP}-*.mp4 docs/
