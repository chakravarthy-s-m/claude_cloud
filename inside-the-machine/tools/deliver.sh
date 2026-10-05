#!/usr/bin/env bash
# Delivery encodes from the master render.
#   out/ep01-keystroke-to-electron.mp4         master (CRF 18 segments, loudness-normalized AAC)
#   → out/ep01-keystroke-to-electron-1080p.mp4  share/YouTube upload (H.264 High, CRF 21, limited-range BT.709)
#   → out/ep01-preview-720p.mp4                 lightweight preview
set -euo pipefail
cd "$(dirname "$0")/.."
EP=${1:-ep01}
MASTER="out/${EP}-keystroke-to-electron.mp4"
VF="scale=in_range=pc:out_range=tv,format=yuv420p"
META=(-metadata title="INSIDE THE MACHINE — Ep 01: From Keystroke to Electron" -metadata comment="How a modern Mac really works")

ffmpeg -y -loglevel error -stats -i "$MASTER" -map 0 \
  -c:v libx264 -preset slow -crf 21 -profile:v high -vf "$VF" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a copy -movflags +faststart "${META[@]}" "out/${EP}-keystroke-to-electron-1080p.mp4"

ffmpeg -y -loglevel error -stats -i "$MASTER" -map 0 \
  -c:v libx264 -preset slow -crf 24 -profile:v high -vf "scale=1280:720:flags=lanczos,$VF" \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 160k -movflags +faststart "${META[@]}" "out/${EP}-preview-720p.mp4"

# storyboard for the README: 16 frames, evenly spaced
ffmpeg -y -loglevel error -ss 20 -i "$MASTER" -vf "fps=1/40,scale=480:-1,tile=4x4:padding=4:color=0x05060d" -frames:v 1 -q:v 3 "docs/${EP}-storyboard.jpg"

ls -la out/${EP}-*.mp4 docs/
