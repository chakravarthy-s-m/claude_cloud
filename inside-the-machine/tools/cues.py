#!/usr/bin/env python3
"""Print cue start frames (scene-local) for quick still picking: tools/cues.py ep02 coldOpen"""
import json, sys
tl = json.load(open(f"src/episodes/{sys.argv[1]}/timeline.json"))
for s in tl["scenes"]:
    if len(sys.argv) > 2 and s["id"] not in sys.argv[2:]:
        continue
    print(f"{s['id']}  dur={s['durationInFrames']}")
    for c in s["cues"]:
        print(f"  {c['id']:4s} {c['from']:5d}-{c['from'] + c['durationInFrames']:5d}  {c['text'][:90]}")
