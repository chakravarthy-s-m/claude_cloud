#!/usr/bin/env python3
"""Extract a glyph outline (with explicit quadratic control points) for the
font-outline animation. usage: tools/.venv/bin/python tools/glyph.py a"""
import json
import sys
from pathlib import Path

from fontTools.pens.recordingPen import RecordingPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
ch = sys.argv[1] if len(sys.argv) > 1 else "a"
font = TTFont(ROOT / "node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2")
gs = font.getGlyphSet(location={"wght": 520})
name = font.getBestCmap()[ord(ch)]
g = gs[name]
rec = RecordingPen()
g.draw(rec)

r = lambda v: round(v, 1)
d, on, off, handles = [], [], [], []
cur = None
start = None
for op, pts in rec.value:
    if op == "moveTo":
        cur = pts[0]
        start = cur
        d.append(f"M{r(cur[0])},{r(cur[1])}")
        on.append([r(cur[0]), r(cur[1])])
    elif op == "lineTo":
        cur = pts[0]
        d.append(f"L{r(cur[0])},{r(cur[1])}")
        on.append([r(cur[0]), r(cur[1])])
    elif op == "qCurveTo":
        *ctrls, end = pts
        if end is None:
            end = start
        for i, c in enumerate(ctrls):
            nxt = end if i == len(ctrls) - 1 else ((c[0] + ctrls[i + 1][0]) / 2, (c[1] + ctrls[i + 1][1]) / 2)
            d.append(f"Q{r(c[0])},{r(c[1])} {r(nxt[0])},{r(nxt[1])}")
            off.append([r(c[0]), r(c[1])])
            handles.append([r(cur[0]), r(cur[1]), r(c[0]), r(c[1])])
            handles.append([r(c[0]), r(c[1]), r(nxt[0]), r(nxt[1])])
            on.append([r(nxt[0]), r(nxt[1])])
            cur = nxt
    elif op in ("closePath", "endPath"):
        d.append("Z")
out = {
    "char": ch,
    "unitsPerEm": font["head"].unitsPerEm,
    "advance": g.width,
    "path": " ".join(d),
    "on": on,
    "off": off,
    "handles": handles,
}
dest = ROOT / "src" / "data" / f"glyph-{ch}.json"
dest.write_text(json.dumps(out))
print(dest, len(on), "on-curve", len(off), "off-curve")
