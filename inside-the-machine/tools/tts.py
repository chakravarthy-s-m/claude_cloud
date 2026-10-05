#!/usr/bin/env python3
"""Narration builder.

Reads episodes/<ep>/script.json, synthesizes every cue line with Kokoro
(offline), masters each clip, then lays the cues out on a frame-accurate
timeline that the Remotion scenes import. Also emits SRT captions.

Lines are cached by a hash of (spoken text, voice, speed), so editing one
line only re-voices that line.

usage: tools/.venv/bin/python tools/tts.py ep01 [--voice af_heart] [--speed 0.94]
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
import time
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
MODELS = ROOT / "tools" / "models"


# Inline pronunciation override: [word](/phonemes/)
OVERRIDE = re.compile(r"\[([^\]]+)\]\(/([^/]+)/\)")


def to_phonemes(kokoro, say: str) -> str:
    """Phonemize text, splicing in any [word](/ipa/) overrides verbatim."""
    parts, pos = [], 0
    for m in OVERRIDE.finditer(say):
        pre = say[pos:m.start()]
        if pre.strip():
            parts.append(kokoro.tokenizer.phonemize(pre, "en-us"))
        parts.append(m.group(2))
        pos = m.end()
    rest = say[pos:]
    if rest.strip():
        parts.append(kokoro.tokenizer.phonemize(rest, "en-us"))
    return " ".join(p.strip() for p in parts)


def spoken(text: str) -> str:
    """Make written punctuation speakable."""
    t = text
    t = t.replace("…", ",").replace("...", ",")
    t = re.sub(r"\s*—\s*", ", ", t)  # em dash -> breath
    t = re.sub(r"^[,\s]+", "", t)
    t = re.sub(r",\s*,", ",", t)
    t = re.sub(r",\s*([.?!:])", r"\1", t)
    return t.strip()


def master(audio: np.ndarray, sr: int) -> np.ndarray:
    """Gentle mastering: DC removal, RMS leveling, soft peak control, fades."""
    a = audio.astype(np.float64)
    a -= a.mean()
    # RMS over voiced frames only (ignore silences)
    frame = int(0.03 * sr)
    n = len(a) // frame
    if n > 0:
        frames = a[: n * frame].reshape(n, frame)
        rms = np.sqrt((frames ** 2).mean(axis=1))
        voiced = rms[rms > rms.max() * 0.08]
        level = float(np.sqrt((voiced ** 2).mean())) if len(voiced) else float(rms.mean())
    else:
        level = float(np.sqrt((a ** 2).mean()))
    target = 10 ** (-18.5 / 20)
    a *= target / max(level, 1e-6)
    # soft clip peaks above -1.5 dBFS
    ceiling = 10 ** (-1.5 / 20)
    a = np.where(np.abs(a) > ceiling * 0.8,
                 np.sign(a) * (ceiling * 0.8 + (ceiling * 0.2) * np.tanh((np.abs(a) - ceiling * 0.8) / (ceiling * 0.2))),
                 a)
    fade = int(0.012 * sr)
    if len(a) > 2 * fade:
        ramp = np.linspace(0.0, 1.0, fade)
        a[:fade] *= ramp
        a[-fade:] *= ramp[::-1]
    return a.astype(np.float32)


def wrap2(text: str, width: int = 42) -> str:
    """Wrap to at most two balanced lines."""
    if len(text) <= width:
        return text
    words = text.split()
    best, best_cost = text, 1e9
    for i in range(1, len(words)):
        a, b = " ".join(words[:i]), " ".join(words[i:])
        cost = max(len(a), len(b))
        if cost < best_cost:
            best, best_cost = f"{a}\n{b}", cost
    return best


def caption_chunks(text: str, start: float, dur: float, max_chars: int = 84):
    """Split a long line into ≤2-line subtitles at natural pauses, timed by character share."""
    def pack(parts: list[str], joiner: str = " ") -> list[str]:
        out, cur = [], ""
        for p in parts:
            cand = f"{cur}{joiner}{p}".strip() if cur else p
            if len(cand) > max_chars and cur:
                out.append(cur)
                cur = p
            else:
                cur = cand
        if cur:
            out.append(cur)
        return out

    chunks: list[str] = []
    for sent in re.split(r"(?<=[.!?…])\s+", text.strip()):
        if len(sent) <= max_chars:
            chunks.append(sent)
            continue
        clauses = re.split(r"(?<=[,;:—])\s+", sent)
        for c in pack(clauses):
            chunks.extend(pack(c.split()) if len(c) > max_chars else [c])
    total = sum(len(c) for c in chunks) or 1
    t = start
    out = []
    for c in chunks:
        d = dur * len(c) / total
        out.append((t, t + d, wrap2(c)))
        t += d
    return out


def srt_time(sec: float) -> str:
    ms = int(round(sec * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("episode")
    ap.add_argument("--voice")
    ap.add_argument("--speed", type=float)
    ap.add_argument("--only", help="comma separated line ids to (re)generate")
    ap.add_argument("--layout-only", action="store_true", help="skip synthesis, rebuild timeline from cached audio")
    args = ap.parse_args()

    ep_dir = ROOT / "episodes" / args.episode
    script = json.loads((ep_dir / "script.json").read_text())
    voice = args.voice or script.get("voice", "af_heart")
    speed = args.speed or script.get("speed", 1.0)
    fps = script.get("fps", 30)
    default_gap = script.get("defaultGap", 0.3)

    out_dir = ROOT / "public" / "audio" / "narration" / args.episode
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_file = out_dir / "cache.json"
    cache = json.loads(cache_file.read_text()) if cache_file.exists() else {}

    kokoro = None
    only = set(args.only.split(",")) if args.only else None

    lines = [ln for sc in script["scenes"] for ln in sc["lines"]]
    t0 = time.time()
    for i, ln in enumerate(lines):
        say = spoken(ln.get("say", ln["text"]))
        key = hashlib.sha1(f"{say}|{voice}|{speed}".encode()).hexdigest()[:12]
        wav = out_dir / f"{ln['id']}.wav"
        fresh = cache.get(ln["id"]) == key and wav.exists()
        if args.layout_only:
            continue
        if only is not None:
            if ln["id"] not in only:
                continue
        elif fresh:
            continue
        if kokoro is None:
            from kokoro_onnx import Kokoro  # noqa: WPS433 (lazy: slow import)
            kokoro = Kokoro(str(MODELS / "kokoro-q8.onnx"), str(MODELS / "voices.npz"))
        st = time.time()
        phonemes = to_phonemes(kokoro, say)
        audio, sr = kokoro.create(phonemes, voice=voice, speed=speed, lang="en-us", is_phonemes=True,
                                  sentence_pause=0.32, clause_pause=0.12)
        audio = master(audio, sr)
        sf.write(wav, audio, sr, subtype="PCM_16")
        cache[ln["id"]] = key
        cache_file.write_text(json.dumps(cache, indent=1))
        print(f"[{i + 1}/{len(lines)}] {ln['id']}: {len(audio) / sr:5.2f}s  ({time.time() - st:4.1f}s)  {say[:70]}", flush=True)

    # ---- layout --------------------------------------------------------
    timeline = {"episode": args.episode, "fps": fps, "voice": voice, "scenes": [], "chapters": script["chapters"]}
    cursor = 0  # frames
    srt, idx = [], 1
    for sc in script["scenes"]:
        t = float(sc.get("lead", 0.5))
        cues = []
        for j, ln in enumerate(sc["lines"]):
            wav = out_dir / f"{ln['id']}.wav"
            info = sf.info(str(wav))
            dur = info.frames / info.samplerate
            start_f = int(round(t * fps))
            dur_f = int(math.ceil(dur * fps))
            cues.append({
                "id": ln["id"],
                "from": start_f,
                "durationInFrames": dur_f,
                "seconds": round(dur, 3),
                "text": ln["text"],
                "say": OVERRIDE.sub(lambda m: m.group(1), spoken(ln.get("say", ln["text"]))),
                "audio": f"audio/narration/{args.episode}/{ln['id']}.wav",
            })
            abs_start = (cursor + start_f) / fps
            for c_start, c_end, c_text in caption_chunks(ln["text"], abs_start, dur):
                srt.append(f"{idx}\n{srt_time(c_start)} --> {srt_time(c_end)}\n{c_text}\n")
                idx += 1
            last = j == len(sc["lines"]) - 1
            t += dur + (0 if last else float(ln.get("gap", default_gap)))
        t += float(sc.get("tail", 0.6))
        dur_frames = int(round(t * fps))
        timeline["scenes"].append({
            "id": sc["id"],
            "chapter": sc["chapter"],
            "from": cursor,
            "durationInFrames": dur_frames,
            "cues": cues,
        })
        cursor += dur_frames
    timeline["durationInFrames"] = cursor

    tl_path = ROOT / "src" / "episodes" / args.episode / "timeline.json"
    tl_path.parent.mkdir(parents=True, exist_ok=True)
    tl_path.write_text(json.dumps(timeline, indent=1))
    (ep_dir / "captions.srt").write_text("\n".join(srt))

    total = cursor / fps
    words = sum(len(ln["text"].split()) for ln in lines)
    print(f"\nTimeline: {len(timeline['scenes'])} scenes, {total:.1f}s ({int(total // 60)}:{int(total % 60):02d}), "
          f"{words} words, synth time {time.time() - t0:.0f}s")
    for s in timeline["scenes"]:
        print(f"  {s['id']:<10} {s['from'] / fps:7.2f}s  +{s['durationInFrames'] / fps:6.2f}s")


if __name__ == "__main__":
    sys.exit(main())
