#!/usr/bin/env python3
"""Procedural, timeline-aware film score.

Reads src/episodes/<ep>/timeline.json, assigns a mood to every scene, and
synthesizes a continuous D-minor score (pads, sub bass, arpeggios, bells,
light drums) that changes character with the story. Narration is analyzed and
the score is ducked underneath it (sidechain-style), then mastered.

Per-scene moods come from the "mood" field in episodes/<ep>/script.json
(falling back to SCENE_MOOD); an optional top-level "score" object can set
"transpose" (semitones) and "bpm" to give each episode its own color.

usage: tools/.venv/bin/python tools/music.py ep01
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
BPM = 120.0
BEAT = 60.0 / BPM
BAR = BEAT * 4
TRANSPOSE = 0  # semitones, set per episode from script.json
rng = np.random.default_rng(42)


def midi(n: float) -> float:
    return 440.0 * 2 ** ((n + TRANSPOSE - 69) / 12)


# chord voicings (MIDI) — D minor family
CH = {
    "Dm": ([38], [50, 57, 62, 64, 65, 69]),
    "Bb": ([34], [46, 53, 58, 60, 62, 65]),
    "F": ([41], [53, 57, 60, 65, 67, 69]),
    "C": ([36], [48, 55, 60, 62, 64, 67]),
    "Gm": ([43], [55, 58, 62, 65, 67, 70]),
    "A": ([33], [45, 52, 57, 61, 64, 69]),
    "Am": ([33], [45, 52, 57, 60, 64, 67]),
    "Dsus": ([38], [50, 57, 62, 64, 69, 74]),
    "D": ([38], [50, 57, 62, 66, 69, 74]),
}

MOODS = {
    #            chords                       bars/chord cutoff arp     arpvol bass  kick  hats  pad   bells
    "mystery": (["Dsus", "Dm", "Bb", "Dm"], 2, 650, None, 0.0, "hold", 0.0, 0.0, 0.8, 0.15),
    "build": (["Dm", "Bb", "F", "C"], 1, 1500, 16, 0.10, "pulse", 0.35, 0.05, 0.8, 0.0),
    "hit": (["Dm"], 3, 2600, None, 0.0, "hold", 0.0, 0.0, 1.1, 0.5),
    "wonder": (["Dm", "Bb", "F", "C"], 2, 1400, 8, 0.10, "hold", 0.0, 0.0, 0.85, 0.2),
    "drive": (["Dm", "Bb", "F", "C"], 1, 2000, 16, 0.11, "pulse", 0.30, 0.05, 0.7, 0.0),
    "flow": (["Bb", "F", "C", "Dm"], 2, 1800, 16, 0.09, "pulse", 0.18, 0.035, 0.75, 0.1),
    "deep": (["Dm", "Gm", "Bb", "A"], 2, 1100, 8, 0.10, "hold", 0.12, 0.0, 0.85, 0.12),
    "descent": (["Dm", "C", "Bb", "A"], 2, 1500, 16, 0.08, "pulse", 0.2, 0.03, 0.75, 0.05),
    "awe": (["Bb", "F", "Gm", "Dm"], 2, 2600, 8, 0.06, "hold", 0.0, 0.0, 1.0, 0.35),
    "tick": (["Dm", "Bb", "F", "A"], 1, 2400, 16, 0.10, "pulse", 0.28, 0.06, 0.7, 0.0),
    "finale": (["Bb", "C", "Dm", "F", "Bb", "C", "D"], 2, 2400, 8, 0.09, "hold", 0.12, 0.02, 1.0, 0.3),
}

SCENE_MOOD = {
    "coldOpen": "mystery",
    "title": "hit",
    "machine": "wonder",
    "stack": "wonder",
    "keyMatrix": "drive",
    "interrupt": "drive",
    "appDraw": "flow",
    "launch": "flow",
    "save": "deep",
    "code": "descent",
    "core": "descent",
    "adder": "descent",
    "cmos": "descent",
    "finfet": "awe",
    "clock": "tick",
    "finale": "finale",
}

# per-mood level (relative)
LEVEL = {"mystery": 0.8, "build": 1.0, "hit": 1.1, "wonder": 0.9, "drive": 1.0, "flow": 0.95, "deep": 0.9, "descent": 0.95, "awe": 1.05, "tick": 1.0, "finale": 1.1}


def saw(freq: float, n: int, phase: float = 0.0) -> np.ndarray:
    t = np.arange(n) / SR
    return 2 * ((t * freq + phase) % 1.0) - 1


def pad_voice(freq: float, n: int, seed: int) -> np.ndarray:
    r = np.random.default_rng(seed)
    out = np.zeros((n, 2))
    for k, det in enumerate((-0.11, 0.0, 0.12)):
        f = freq * 2 ** (det / 12)
        ph = r.random()
        s = saw(f, n, ph)
        pan = (k - 1) * 0.6
        out[:, 0] += s * np.cos((pan + 1) * np.pi / 4)
        out[:, 1] += s * np.sin((pan + 1) * np.pi / 4)
    return out / 3


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, min(fc, SR / 2 - 200), btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, fc, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x, axis=0)


def env_adsr(n: int, a: float, r: float) -> np.ndarray:
    t = np.arange(n) / SR
    dur = n / SR
    e = np.minimum(1, t / max(a, 1e-3)) * np.minimum(1, (dur - t) / max(r, 1e-3))
    return np.clip(e, 0, 1) ** 1.5


def pluck(freq: float, dur: float, bright: float = 1.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = (2 / np.pi) * np.arcsin(np.sin(2 * np.pi * freq * t)) * 0.7 + saw(freq * 1.002, n) * 0.3 * bright
    e = np.exp(-t * 9) * np.minimum(1, t / 0.003)
    return x * e


def bell(freq: float, dur: float = 3.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    mod = np.sin(2 * np.pi * freq * 3.5 * t) * np.exp(-t * 3) * 2.2
    x = np.sin(2 * np.pi * freq * t + mod) * np.exp(-t * 1.4) * np.minimum(1, t / 0.004)
    return x


def kick(dur: float = 0.45) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * np.exp(-t * 7.5) * 1.6)


def hat(dur: float = 0.06) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    sos = signal.butter(2, 7000, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x) * np.exp(-t * 70) * 0.5


def place(buf: np.ndarray, x: np.ndarray, at: float, gain: float = 1.0, pan: float = 0.0) -> None:
    i = int(at * SR)
    if i >= len(buf) or i < -len(x):
        return
    if x.ndim == 1:
        x = np.stack([x * np.cos((pan + 1) * np.pi / 4), x * np.sin((pan + 1) * np.pi / 4)], axis=1) * np.sqrt(2)
    j0 = max(0, i)
    k0 = j0 - i
    k1 = min(len(x), len(buf) - i)
    if k1 > k0:
        buf[j0: i + k1] += x[k0:k1] * gain


def reverb_ir(decay: float = 3.2) -> np.ndarray:
    n = int(decay * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], axis=1) * np.exp(-t * 6.9 / decay)[:, None]
    ir = lp(ir, 5200)
    ir[: int(0.02 * SR)] = 0
    return ir / np.sqrt((ir ** 2).sum(axis=0))


def convolve(x: np.ndarray, ir: np.ndarray) -> np.ndarray:
    out = np.stack([signal.fftconvolve(x[:, c], ir[:, c])[: len(x)] for c in range(2)], axis=1)
    return out


def render_section(mood: str, start: float, end: float, chord_offset: int, intensity_ramp: tuple[float, float] = (1.0, 1.0)):
    chords, bars_per, cutoff, arp_div, arp_vol, bass_mode, kick_vol, hat_vol, pad_vol, bell_vol = MOODS[mood]
    dur = end - start
    n = int(dur * SR)
    pads = np.zeros((n, 2))
    arps = np.zeros((n, 2))
    bass = np.zeros((n, 2))
    drums = np.zeros((n, 2))
    bells = np.zeros((n, 2))
    chord_len = bars_per * BAR
    # align chords to the global bar grid
    t0 = np.floor(start / chord_len) * chord_len
    k = 0
    t = t0
    while t < end:
        name = chords[(k + chord_offset) % len(chords)]
        if mood == "finale" and t + chord_len >= end - 0.01:
            name = "D"  # resolve to D major at the very end
        roots, tones = CH[name]
        seg_start = max(t, start)
        seg_end = min(t + chord_len + 1.2, end)  # overlap for legato
        sn = int((seg_end - seg_start) * SR)
        if sn > 0:
            seg = np.zeros((sn, 2))
            for vi, m in enumerate(tones):
                seg += pad_voice(midi(m), sn, seed=hash((name, vi)) % 10000) * (0.9 if vi < 3 else 0.6)
            seg *= env_adsr(sn, 0.9 if mood != "hit" else 0.02, 1.4)[:, None]
            off = int((seg_start - start) * SR)
            pads[off: off + sn] += seg[: n - off]
            # sub bass
            bt = np.arange(sn) / SR
            bf = midi(roots[0] - 12 if roots[0] > 40 else roots[0])
            sub = np.sin(2 * np.pi * bf * bt) + 0.25 * np.sin(2 * np.pi * bf * 2 * bt)
            if bass_mode == "pulse":
                beat_phase = ((bt + (seg_start % BEAT)) % (BEAT / 2)) / (BEAT / 2)
                sub *= 0.35 + 0.65 * np.exp(-beat_phase * 5)
            sub *= env_adsr(sn, 0.05, 0.6)
            bass[off: off + sn, 0] += sub[: n - off]
            bass[off: off + sn, 1] += sub[: n - off]
            # arpeggio
            if arp_div:
                step = BAR / arp_div
                pattern = [0, 2, 3, 5, 4, 2, 3, 1]
                tt = np.ceil(seg_start / step) * step
                i = int(round(tt / step))
                while tt < min(t + chord_len, end):
                    m = tones[pattern[i % len(pattern)] % len(tones)] + (12 if (i // 8) % 2 else 0)
                    p = pluck(midi(m), min(0.5, step * 3))
                    place(arps, p, tt - start, gain=arp_vol * (0.75 + 0.25 * ((i % 4) == 0)), pan=0.5 * np.sin(i * 1.3))
                    tt += step
                    i += 1
            # bells on chord changes
            if bell_vol > 0 and (k % 2 == 0):
                place(bells, bell(midi(tones[-1] + 12), 3.5), seg_start - start, gain=bell_vol * 0.25, pan=0.4 * np.sin(k))
        t += chord_len
        k += 1
    # drums
    if kick_vol > 0 or hat_vol > 0:
        tt = np.ceil(start / BEAT) * BEAT
        i = int(round(tt / BEAT))
        while tt < end:
            if kick_vol > 0 and i % 2 == 0:
                place(drums, kick(), tt - start, gain=kick_vol * 0.7)
            if hat_vol > 0:
                place(drums, hat(), tt - start + BEAT / 2, gain=hat_vol, pan=0.3)
                place(drums, hat(0.03), tt - start, gain=hat_vol * 0.5, pan=-0.3)
            tt += BEAT
            i += 1
    pads = lp(pads, cutoff) * pad_vol * 0.22
    arps = lp(arps, cutoff * 3.2) * 1.15
    bass = lp(bass, 160) * 0.19
    mix = pads + arps + bass + drums * 0.6 + bells
    # intensity ramp across the section
    ramp = np.linspace(intensity_ramp[0], intensity_ramp[1], n)[:, None]
    return mix * ramp * LEVEL[mood], (pads + arps + bells) * ramp * LEVEL[mood]


def narration_envelope(timeline: dict, total: float) -> np.ndarray:
    """Per-sample 0..1 'voice active' envelope built from the narration files."""
    fps = timeline["fps"]
    env = np.zeros(int(total * SR))
    for sc in timeline["scenes"]:
        for cue in sc["cues"]:
            path = ROOT / "public" / cue["audio"]
            a, sr = sf.read(path)
            if a.ndim > 1:
                a = a.mean(axis=1)
            hop = int(sr * 0.02)
            frames = len(a) // hop
            rms = np.sqrt(np.mean(a[: frames * hop].reshape(frames, hop) ** 2, axis=1))
            act = (rms > 0.01).astype(float)
            start = (sc["from"] + cue["from"]) / fps
            for j, v in enumerate(act):
                if v:
                    i0 = int((start + j * 0.02) * SR)
                    env[i0: i0 + int(0.02 * SR)] = 1.0
    # smooth: fast attack, slow release
    out = np.zeros_like(env)
    att = np.exp(-1 / (0.06 * SR))
    rel = np.exp(-1 / (0.6 * SR))
    y = 0.0
    # block-wise for speed
    step = 240
    for i in range(0, len(env), step):
        target = env[i: i + step].max()
        coef = att if target > y else rel
        y = target + (y - target) * coef ** step
        out[i: i + step] = y
    return out


def main() -> None:
    global BPM, BEAT, BAR, TRANSPOSE
    ep = sys.argv[1] if len(sys.argv) > 1 else "ep01"
    tl = json.loads((ROOT / "src" / "episodes" / ep / "timeline.json").read_text())
    script = json.loads((ROOT / "episodes" / ep / "script.json").read_text())
    moods = {sc["id"]: sc.get("mood") for sc in script["scenes"]}
    score = script.get("score", {})
    TRANSPOSE = int(score.get("transpose", 0))
    BPM = float(score.get("bpm", BPM))
    BEAT = 60.0 / BPM
    BAR = BEAT * 4
    fps = tl["fps"]
    total = tl["durationInFrames"] / fps + 4.0
    n = int(total * SR)
    music = np.zeros((n, 2))
    wet_send = np.zeros((n, 2))
    xf = 1.6  # crossfade seconds between sections
    sections = []
    for sc in tl["scenes"]:
        s0 = sc["from"] / fps
        s1 = (sc["from"] + sc["durationInFrames"]) / fps
        mood = moods.get(sc["id"]) or SCENE_MOOD.get(sc["id"], "wonder")
        if sc["id"] == "coldOpen":
            split = s0 + sc["cues"][3]["from"] / fps - 0.3  # montage begins at o4
            sections.append(("mystery", s0, split, (0.5, 1.0)))
            sections.append(("build", split, s1, (0.7, 1.15)))
        elif sc["id"] == "finale":
            sections.append(("finale", s0, s1 + 3.0, (0.85, 1.1)))
        else:
            sections.append((mood, s0, s1, (0.95, 1.05)))
    offset = 0
    for i, (mood, s0, s1, ramp) in enumerate(sections):
        a = max(0.0, s0 - (xf / 2 if i else 0))
        b = min(total, s1 + xf / 2)
        mix, wet = render_section(mood, a, b, offset, ramp)
        offset += 1
        L = len(mix)
        e = np.ones(L)
        fi = int(xf * SR) if i else int(0.05 * SR)
        fo = int(xf * SR)
        e[:fi] = np.linspace(0, 1, fi)
        e[-fo:] *= np.linspace(1, 0, fo)
        i0 = int(a * SR)
        music[i0: i0 + L] += mix[: n - i0] * e[: n - i0, None]
        wet_send[i0: i0 + L] += wet[: n - i0] * e[: n - i0, None]
        print(f"  {mood:<8} {a:7.1f}s → {b:7.1f}s")
    print("reverb…")
    music += convolve(wet_send, reverb_ir(3.4)) * 0.55
    # gentle wind/air bed in the cold open
    t_open = tl["scenes"][0]["durationInFrames"] / fps
    m = int(t_open * SR)
    air = hp(lp(np.stack([rng.standard_normal(m), rng.standard_normal(m)], axis=1), 900), 120) * 0.05
    air *= np.minimum(1, np.arange(m) / (3 * SR))[:, None] * np.minimum(1, (m - np.arange(m)) / (2 * SR))[:, None]
    music[:m] += air
    # ducking under narration
    print("ducking…")
    env = narration_envelope(tl, total)
    duck = 1.0 - 0.65 * env  # ≈ −9 dB under voice
    music *= duck[:, None]
    # fade the very end
    end_s = tl["durationInFrames"] / fps
    fo = int(3.0 * SR)
    ie = int(end_s * SR)
    music[ie - fo: ie] *= np.linspace(1, 0, fo)[:, None]
    music[ie:] = 0
    music = music[:ie]
    # master: high-pass rumble, soft clip, normalize to −20 dBFS RMS-ish
    music = hp(music, 28)
    rms = np.sqrt(np.mean(music ** 2))
    music *= 10 ** (-27.5 / 20) / max(rms, 1e-9)
    music = np.tanh(music * 1.2) / 1.2
    peak = np.abs(music).max()
    if peak > 0.89:
        music *= 0.89 / peak
    out = ROOT / "public" / "audio" / "music" / f"{ep}-score.wav"
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, music.astype(np.float32), SR, subtype="PCM_16")
    # the project references a 320 kbps MP3 (the WAV is too large for git)
    import subprocess

    mp3 = out.with_suffix(".mp3")
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", str(out), "-c:a", "libmp3lame", "-b:a", "320k", str(mp3)], check=True)
    print(f"wrote {out} + {mp3.name} ({len(music) / SR:.1f}s)")


if __name__ == "__main__":
    main()
