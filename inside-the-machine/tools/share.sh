#!/usr/bin/env bash
# Two-part 720p encodes sized for chat/upload limits (< 30 MiB each), split at the
# chapter boundary closest to the middle so each half is a natural watch.
# usage: tools/share.sh [ep01]
set -euo pipefail
cd "$(dirname "$0")/.."
EP=${1:-ep01}
read -r SLUG NUM < <(python3 -c "import json;s=json.load(open('episodes/$EP/script.json'));print(s['slug'], s['id'][2:])")
MASTER="out/${EP}-${SLUG}.mp4"
# chapter start closest to the midpoint (Ep01 → Chapter 04 at 332.567 s)
SPLIT=$(python3 - "$EP" <<'PY'
import json, sys
tl = json.load(open(f"src/episodes/{sys.argv[1]}/timeline.json"))
sc, fps = tl["scenes"], tl["fps"]
starts = [s["from"] for i, s in enumerate(sc) if i > 0 and sc[i - 1]["chapter"] != s["chapter"]]
mid = tl["durationInFrames"] / 2
print(f"{min(starts, key=lambda f: abs(f - mid)) / fps:.3f}")
PY
)
TOTAL=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$MASTER")
TARGET_MIB=28.4
VF="scale=1280:720:flags=lanczos,scale=in_range=pc:out_range=tv,format=yuv420p"
echo "split at ${SPLIT}s of ${TOTAL}s"
enc() { # name start dur
  local name=$1 ss=$2 dur=$3
  local kbps=$(python3 -c "print(int(${TARGET_MIB}*8*1024*1024/${dur}/1000 - 112))")
  echo "== $name: ${dur}s @ ${kbps}k video"
  ffmpeg -y -loglevel error -ss "$ss" -t "$dur" -i "$MASTER" -map 0:v -c:v libx264 -preset slow -b:v ${kbps}k -pass 1 -passlogfile "out/pass-${EP}-$name" -vf "$VF" -an -f mp4 /dev/null
  ffmpeg -y -loglevel error -ss "$ss" -t "$dur" -i "$MASTER" -map 0:v -map 0:a -c:v libx264 -preset slow -b:v ${kbps}k -pass 2 -passlogfile "out/pass-${EP}-$name" -vf "$VF" \
    -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
    -c:a aac -b:a 96k -movflags +faststart \
    -metadata title="INSIDE THE MACHINE — Ep ${NUM} ($name)" "out/${EP}-$name.mp4"
  rm -f "out/pass-${EP}-${name}"*
}
enc "part1-720p" 0 "$SPLIT"
enc "part2-720p" "$SPLIT" "$(python3 -c "print(${TOTAL}-${SPLIT})")"
ls -la out/${EP}-part*.mp4
