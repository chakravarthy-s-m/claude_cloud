#!/usr/bin/env bash
# Two-part 720p encodes sized for chat/upload limits (< 30 MiB each), split at the
# start of Chapter 04 so each half is a natural watch.
set -euo pipefail
cd "$(dirname "$0")/.."
MASTER="out/ep01-keystroke-to-electron.mp4"
SPLIT=332.567   # Chapter 04 "Saving a File" begins (frame 9977 / 30)
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MASTER")
TARGET_MIB=28.4
VF="scale=1280:720:flags=lanczos,scale=in_range=pc:out_range=tv,format=yuv420p"
enc() { # name start dur
  local name=$1 ss=$2 dur=$3
  local kbps=$(python3 -c "print(int(${TARGET_MIB}*8*1024*1024/${dur}/1000 - 112))")
  echo "== $name: ${dur}s @ ${kbps}k video"
  ffmpeg -y -loglevel error -ss "$ss" -t "$dur" -i "$MASTER" -map 0:v -c:v libx264 -preset slow -b:v ${kbps}k -pass 1 -passlogfile out/pass-$name -vf "$VF" -an -f mp4 /dev/null
  ffmpeg -y -loglevel error -ss "$ss" -t "$dur" -i "$MASTER" -map 0:v -map 0:a -c:v libx264 -preset slow -b:v ${kbps}k -pass 2 -passlogfile out/pass-$name -vf "$VF" \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 96k -movflags +faststart \
    -metadata title="INSIDE THE MACHINE — Ep 01 ($name)" "out/ep01-$name.mp4"
  rm -f out/pass-$name*
}
enc "part1-720p" 0 "$SPLIT"
enc "part2-720p" "$SPLIT" "$(python3 -c "print(${TOTAL}-${SPLIT})")"
ls -la out/ep01-part*.mp4
