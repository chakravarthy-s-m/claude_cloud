#!/usr/bin/env python3
"""Procedural sound-effects library (no samples, fully synthesized).

Writes 48 kHz stereo WAVs to public/audio/sfx/. Deterministic (seeded).
usage: tools/.venv/bin/python tools/sfx.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

SR = 48000
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "sfx"
rng = np.random.default_rng(7)


# ------------------------------------------------------------ primitives
def t_axis(dur: float) -> np.ndarray:
    return np.arange(int(round(dur * SR))) / SR


def noise(dur: float) -> np.ndarray:
    return rng.standard_normal(int(round(dur * SR)))


def env_ad(n: int, a: float, d: float, curve: float = 4.0) -> np.ndarray:
    """Attack (s) then exponential decay (time constant-ish d)."""
    t = np.arange(n) / SR
    att = np.clip(t / max(a, 1e-4), 0, 1)
    dec = np.exp(-np.maximum(t - a, 0) * curve / max(d, 1e-4))
    return att * dec


def bp(x: np.ndarray, lo: float, hi: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, [lo, min(hi, SR / 2 - 100)], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, min(f, SR / 2 - 100), btype="low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def hp(x: np.ndarray, f: float, order: int = 2) -> np.ndarray:
    sos = signal.butter(order, f, btype="high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def svf_sweep(x: np.ndarray, f0: float, f1: float, q: float = 0.7, mode: str = "bp", shape: float = 1.0) -> np.ndarray:
    """State-variable filter with exponential cutoff sweep f0→f1."""
    n = len(x)
    p = (np.arange(n) / max(1, n - 1)) ** shape
    fc = f0 * (f1 / f0) ** p
    g = np.tan(np.pi * np.clip(fc, 20, SR * 0.45) / SR)
    k = 1.0 / q
    ic1 = ic2 = 0.0
    out = np.empty(n)
    for i in range(n):
        gi = g[i]
        a1 = 1 / (1 + gi * (gi + k))
        v3 = x[i] - ic2
        v1 = a1 * ic1 + gi * a1 * v3
        v2 = ic2 + gi * v1
        ic1 = 2 * v1 - ic1
        ic2 = 2 * v2 - ic2
        out[i] = v1 if mode == "bp" else (v2 if mode == "lp" else x[i] - k * v1 - v2)
    return out


def tone(freq, dur: float, kind: str = "sine") -> np.ndarray:
    n = int(round(dur * SR))
    f = np.full(n, freq) if np.isscalar(freq) else np.asarray(freq)
    ph = 2 * np.pi * np.cumsum(f) / SR
    if kind == "sine":
        return np.sin(ph)
    if kind == "tri":
        return 2 / np.pi * np.arcsin(np.sin(ph))
    if kind == "saw":
        return 2 * ((ph / (2 * np.pi)) % 1.0) - 1
    if kind == "square":
        return np.sign(np.sin(ph))
    raise ValueError(kind)


def glide(f0: float, f1: float, dur: float, shape: float = 1.0) -> np.ndarray:
    n = int(round(dur * SR))
    p = (np.arange(n) / max(1, n - 1)) ** shape
    return f0 * (f1 / f0) ** p


def reverb(x: np.ndarray, decay: float = 1.6, mix: float = 0.3, pre: float = 0.012, bright: float = 6000) -> np.ndarray:
    """Stereo convolution reverb with a synthetic exponentially-decaying IR."""
    n = int(decay * SR)
    t = np.arange(n) / SR
    irs = []
    for _ in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 6.9 / decay)
        ir = lp(ir, bright)
        ir[: int(pre * SR)] = 0
        irs.append(ir / np.sqrt((ir ** 2).sum()))
    mono = x if x.ndim == 1 else x.mean(axis=1)
    wet = np.stack([signal.fftconvolve(mono, ir) for ir in irs], axis=1)
    dry = np.stack([mono, mono], axis=1) if x.ndim == 1 else x
    dry = np.pad(dry, ((0, len(wet) - len(dry)), (0, 0)))
    return dry * (1 - mix) + wet * mix * 1.6


def stereo(x: np.ndarray, pan: float = 0.0, width: float = 0.0) -> np.ndarray:
    if x.ndim == 2:
        return x
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    st = np.stack([x * l, x * r], axis=1) * np.sqrt(2)
    if width > 0:
        d = int(width * 0.012 * SR)
        st[:, 1] = np.concatenate([np.zeros(d), st[:-d, 1]]) if d else st[:, 1]
    return st


def autopan(x: np.ndarray, p0: float, p1: float) -> np.ndarray:
    mono = x if x.ndim == 1 else x.mean(axis=1)
    p = np.linspace(p0, p1, len(mono))
    l = np.cos((p + 1) * np.pi / 4)
    r = np.sin((p + 1) * np.pi / 4)
    return np.stack([mono * l, mono * r], axis=1) * np.sqrt(2)


def fade(x: np.ndarray, fi: float = 0.003, fo: float = 0.02) -> np.ndarray:
    n = len(x)
    a, b = int(fi * SR), int(fo * SR)
    e = np.ones(n)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if b:
        e[-b:] *= np.linspace(1, 0, b)
    return x * (e[:, None] if x.ndim == 2 else e)


def write(name: str, x: np.ndarray, peak: float = 0.89) -> None:
    x = stereo(x) if x.ndim == 1 else x
    x = fade(x)
    m = np.abs(x).max() or 1
    x = x / m * peak
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
    print(f"  {name:<14} {len(x) / SR:5.2f}s")


def soft(x: np.ndarray, drive: float = 1.5) -> np.ndarray:
    return np.tanh(x * drive) / np.tanh(drive)


# ------------------------------------------------------------ sounds
def whoosh(dur=1.0, f0=300, f1=4000, q=1.4, pan=(-0.7, 0.7), shape=1.0):
    n = noise(dur)
    x = svf_sweep(n, f0, f1, q=q, shape=shape)
    t = t_axis(dur)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.6
    x = x * e
    return reverb(autopan(x, *pan), decay=1.1, mix=0.22)


def key_click():
    # plastic tick + low "thock" + tiny bottom-out
    d = 0.22
    t = t_axis(d)
    tick = bp(noise(d), 2500, 9000) * env_ad(len(t), 0.0008, 0.018, 5)
    thock = tone(glide(240, 150, d), d) * env_ad(len(t), 0.002, 0.07, 5) * 0.9
    body = bp(noise(d), 300, 1400) * env_ad(len(t), 0.001, 0.05, 6) * 0.6
    x = tick * 1.2 + thock + body
    return reverb(stereo(x), decay=0.5, mix=0.12, bright=7000)


def mouse_click():
    d = 0.12
    t = t_axis(d)
    x = bp(noise(d), 1800, 7000) * env_ad(len(t), 0.0005, 0.012, 6)
    x += tone(1800, d) * env_ad(len(t), 0.0005, 0.01, 7) * 0.3
    x2 = np.concatenate([np.zeros(int(0.045 * SR)), x[: int(0.075 * SR)] * 0.6])
    return reverb(stereo(x + x2[: len(x)]), decay=0.3, mix=0.1)


def impact(dur=3.2, sub=46):
    t = t_axis(dur)
    s = tone(glide(sub * 2.2, sub, dur, 0.25), dur) * env_ad(len(t), 0.004, 1.9, 4)
    hit = lp(noise(dur), 2500) * env_ad(len(t), 0.001, 0.22, 6) * 0.9
    crack = hp(noise(dur), 3000) * env_ad(len(t), 0.0005, 0.05, 6) * 0.5
    x = soft(s * 1.2 + hit + crack, 1.3)
    return reverb(stereo(x, width=0.5), decay=2.8, mix=0.35, bright=4500)


def braam(dur=4.8):
    t = t_axis(dur)
    e = env_ad(len(t), 0.03, 3.2, 3.2)
    x = np.zeros(len(t))
    for f, a in ((55, 1.0), (55 * 1.5, 0.55), (110, 0.5), (55 * 1.004, 0.8), (82.4 * 0.997, 0.5)):
        x += tone(f, dur, "saw") * a
    x = svf_sweep(x, 2400, 220, q=0.9, mode="lp", shape=0.5)
    x = soft(x * 0.6, 2.2) * e
    x += tone(glide(70, 41, dur, 0.3), dur) * env_ad(len(t), 0.005, 2.4, 3.5) * 1.1
    x += hp(noise(dur), 1500) * env_ad(len(t), 0.001, 0.25, 6) * 0.25
    return reverb(stereo(x, width=0.7), decay=3.5, mix=0.4, bright=3500)


def riser(dur=2.6):
    t = t_axis(dur)
    n = svf_sweep(noise(dur), 300, 9000, q=2.0, shape=2.2) * (t / dur) ** 2.2
    tn = tone(glide(180, 1400, dur, 2.4), dur, "saw")
    tn = lp(tn, 5000) * (t / dur) ** 3 * 0.25
    x = n + tn
    x[-int(0.02 * SR):] *= np.linspace(1, 0, int(0.02 * SR))
    return reverb(autopan(x, -0.4, 0.4), decay=1.4, mix=0.3)


def blip(freq=1320, dur=0.09, kind="sine"):
    t = t_axis(dur)
    x = tone(freq, dur, kind) * env_ad(len(t), 0.002, 0.05, 5)
    x += tone(freq * 2, dur) * env_ad(len(t), 0.001, 0.02, 6) * 0.25
    return reverb(stereo(x), decay=0.6, mix=0.18)


def data_chatter(dur=0.7, rate=34, seed=3):
    r = np.random.default_rng(seed)
    out = np.zeros(int(round(dur * SR)) + SR // 4)
    k = int(dur * rate)
    for i in range(k):
        f = r.choice([880, 1175, 1320, 1568, 1760, 2093, 2349])
        b = tone(f, 0.03, "square") * env_ad(int(0.03 * SR), 0.001, 0.015, 5) * 0.35
        b = lp(b, 6000)
        at = int(i / rate * SR)
        out[at: at + len(b)] += b * (0.6 + 0.4 * r.random())
    x = out * np.linspace(1, 0.6, len(out))
    return reverb(autopan(x, -0.5, 0.5), decay=0.5, mix=0.15)


def tick(freq=3200, dur=0.03, amp=1.0):
    t = t_axis(dur)
    x = (tone(freq, dur) * 0.6 + bp(noise(dur), 3000, 9000) * 0.5) * env_ad(len(t), 0.0003, 0.008, 6) * amp
    return stereo(x)


def zap(dur=0.45):
    t = t_axis(dur)
    car = glide(2400, 160, dur, 0.5)
    mod = tone(glide(900, 60, dur, 0.6), dur) * 900
    x = tone(car + mod, dur) * env_ad(len(t), 0.001, 0.3, 4)
    x += bp(noise(dur), 1500, 8000) * env_ad(len(t), 0.0005, 0.12, 5) * 0.6
    return reverb(stereo(soft(x, 1.8), width=0.4), decay=0.9, mix=0.25)


def alarm():
    d = 0.62
    out = np.zeros(int(d * SR))
    for i, f in enumerate((988, 740)):
        seg = tone(f, 0.16, "square") * env_ad(int(0.16 * SR), 0.002, 0.12, 3)
        seg = lp(seg, 3500) * 0.6
        at = int(i * 0.17 * SR)
        out[at: at + len(seg)] += seg
    return reverb(stereo(out), decay=0.9, mix=0.25)


def glitch(dur=0.45, seed=11):
    r = np.random.default_rng(seed)
    out = np.zeros(int(round(dur * SR)))
    pos = 0
    while pos < len(out):
        seg_len = int(r.uniform(0.008, 0.05) * SR)
        kind = r.integers(0, 3)
        if kind == 0:
            seg = tone(r.uniform(200, 3000), seg_len / SR, "square") * 0.4
        elif kind == 1:
            seg = hp(rng.standard_normal(seg_len), 2000) * 0.5
        else:
            seg = np.zeros(seg_len)
        out[pos: pos + seg_len] = seg[: len(out) - pos]
        pos += seg_len
    out = np.round(out * 6) / 6  # bitcrush
    return stereo(out * np.linspace(1, 0.5, len(out)), width=0.3)


def pop(freq=520):
    d = 0.14
    t = t_axis(d)
    x = tone(glide(freq * 1.9, freq, d, 0.3), d) * env_ad(len(t), 0.001, 0.06, 5)
    return reverb(stereo(x), decay=0.5, mix=0.15)


def shimmer(dur=1.8, seed=5):
    r = np.random.default_rng(seed)
    t = t_axis(dur)
    x = np.zeros(len(t))
    notes = [1568, 1760, 2093, 2349, 2637, 3136, 3520]
    for i in range(18):
        f = r.choice(notes)
        st = r.uniform(0, dur * 0.6)
        n = len(t) - int(st * SR)
        b = (tone(f, n / SR) + 0.3 * tone(f * 2.01, n / SR)) * env_ad(n, 0.002, 0.5, 4) * 0.25
        x[int(st * SR):] += b
    return reverb(autopan(x, -0.6, 0.6), decay=2.4, mix=0.45, bright=9000)


def chime(f0=1046.5):
    d = 2.6
    t = t_axis(d)
    x = np.zeros(len(t))
    for ratio, a, dec in ((1, 1, 1.6), (2.76, 0.4, 0.7), (5.4, 0.2, 0.4), (2, 0.3, 1.0)):
        x += tone(f0 * ratio, d) * env_ad(len(t), 0.001, dec, 3) * a
    return reverb(stereo(x * 0.5), decay=2.5, mix=0.4, bright=9000)


def boom_soft():
    d = 1.6
    t = t_axis(d)
    x = tone(glide(110, 42, d, 0.35), d) * env_ad(len(t), 0.003, 0.9, 4)
    x += lp(noise(d), 600) * env_ad(len(t), 0.001, 0.15, 6) * 0.4
    return reverb(stereo(soft(x, 1.4)), decay=1.8, mix=0.3, bright=3000)


def sweep(up=True, dur=0.8):
    t = t_axis(dur)
    f = glide(220, 1760, dur, 1.6) if up else glide(1760, 180, dur, 0.6)
    x = tone(f, dur, "saw")
    x = svf_sweep(x, 800 if up else 5000, 6000 if up else 600, q=1.2, mode="lp")
    x *= np.sin(np.pi * t / dur) ** 1.2 * 0.4
    return reverb(autopan(x, -0.3 if up else 0.3, 0.3 if up else -0.3), decay=1.2, mix=0.3)


def hum(dur=3.5):
    t = t_axis(dur)
    x = np.zeros(len(t))
    for h, a in ((120, 1.0), (240, 0.5), (360, 0.35), (480, 0.2), (720, 0.1)):
        x += tone(h * (1 + 0.002 * np.sin(2 * np.pi * 0.3 * t)), dur) * a
    crackle = bp(noise(dur), 2000, 9000) * (rng.random(len(t)) > 0.9985) * 4
    x = soft(x * 0.5, 1.6) + lp(crackle, 9000)
    e = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.6)
    return stereo(x * e * 0.6, width=0.6)


def clock_tick():
    d = 0.05
    t = t_axis(d)
    x = bp(noise(d), 4000, 12000) * env_ad(len(t), 0.0002, 0.006, 6)
    x += tone(5200, d) * env_ad(len(t), 0.0002, 0.004, 6) * 0.5
    return reverb(stereo(x), decay=0.4, mix=0.15)


def power(up=True):
    d = 1.3
    t = t_axis(d)
    f = glide(90, 880, d, 1.4) if up else glide(880, 70, d, 0.5)
    x = tone(f, d, "saw") * 0.4 + tone(f * 0.5, d) * 0.6
    x = lp(x, 3000) * (np.minimum(1, t / 0.05) * (np.exp(-np.maximum(0, t - 0.9) * 8) if up else np.exp(-t * 1.5)))
    return reverb(stereo(x, width=0.4), decay=1.3, mix=0.3)


def scan(dur=1.6):
    t = t_axis(dur)
    rate = 18
    gate = (np.sin(2 * np.pi * rate * t) > 0.6).astype(float)
    gate = lp(gate, 200)
    x = tone(1400 + 300 * np.sin(2 * np.pi * 0.7 * t), dur, "tri") * gate * 0.3
    x += bp(noise(dur), 3000, 7000) * gate * 0.12
    e = np.minimum(1, t / 0.15) * np.minimum(1, (dur - t) / 0.3)
    return reverb(autopan(x * e, -0.5, 0.5), decay=0.7, mix=0.2)


def bounce():
    d = 0.42
    out = np.zeros(int(d * SR))
    times = [0, 0.03, 0.05, 0.075, 0.09, 0.11, 0.122, 0.135]
    for i, s in enumerate(times):
        b = tick(2600 + i * 120, 0.02, 1 - i * 0.08)[:, 0]
        at = int(s * SR)
        out[at: at + len(b)] += b
    return reverb(stereo(out), decay=0.4, mix=0.15)


def thud():
    d = 0.6
    t = t_axis(d)
    x = tone(glide(160, 60, d, 0.4), d) * env_ad(len(t), 0.002, 0.18, 5)
    x += lp(noise(d), 900) * env_ad(len(t), 0.001, 0.06, 6) * 0.5
    x += bp(noise(d), 2000, 5000) * env_ad(len(t), 0.0005, 0.02, 6) * 0.3
    return reverb(stereo(soft(x, 1.6)), decay=0.8, mix=0.2)


def portal():
    d = 1.4
    t = t_axis(d)
    x = whoosh(1.2, 200, 3000, q=1.0)[:, 0]
    sh = shimmer(1.4, seed=9)[:, 0]
    n = max(len(x), len(sh))
    x = np.pad(x, (0, n - len(x))) + np.pad(sh, (0, n - len(sh))) * 0.6
    x += np.pad(tone(glide(300, 900, d, 1.5), d) * np.sin(np.pi * t / d) * 0.2, (0, n - len(t)))
    return reverb(autopan(x, -0.3, 0.3), decay=1.5, mix=0.3)


def swell(dur=2.4):
    t = t_axis(dur)
    x = np.zeros(len(t))
    for f in (220, 277.2, 329.6, 440):
        x += tone(f * (1 + 0.003 * np.sin(2 * np.pi * 0.5 * t + f)), dur, "saw")
    x = svf_sweep(x, 400, 3500, q=0.8, mode="lp", shape=1.5)
    e = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 1.5
    return reverb(stereo(x * e * 0.2, width=0.8), decay=2.5, mix=0.45)


def typing(n=5, seed=4):
    r = np.random.default_rng(seed)
    out = np.zeros(int((n * 0.13 + 0.4) * SR))
    k = key_click()[:, 0]
    pos = 0.0
    for _ in range(n):
        at = int(pos * SR)
        seg = k * r.uniform(0.6, 1.0)
        out[at: at + len(seg)] += seg[: len(out) - at]
        pos += r.uniform(0.09, 0.16)
    return stereo(out)


def heartbeat_pulse():
    d = 0.5
    t = t_axis(d)
    x = tone(glide(90, 50, d, 0.5), d) * env_ad(len(t), 0.003, 0.2, 5)
    return stereo(soft(x, 1.3))


def electrons(dur=2.4, seed=21):
    """Granular sizzle: thousands of tiny ticks, like charge flowing."""
    r = np.random.default_rng(seed)
    n = int(round(dur * SR))
    x = np.zeros(n)
    k = int(dur * 900)
    pos = r.integers(0, n - 200, k)
    g = np.hanning(64) * r.uniform(0.2, 1)[..., None] if False else None
    for p in pos:
        L = int(r.integers(24, 96))
        f = r.uniform(2500, 9000)
        x[p: p + L] += np.sin(2 * np.pi * f * np.arange(L) / SR) * np.hanning(L) * r.uniform(0.1, 0.6)
    e = np.minimum(1, np.arange(n) / (0.3 * SR)) * np.minimum(1, (n - np.arange(n)) / (0.5 * SR))
    x = x * e
    return reverb(autopan(x, -0.6, 0.6), decay=0.9, mix=0.3)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    print("Synthesizing SFX →", OUT)
    write("whoosh", whoosh(0.9, 350, 5000))
    write("whoosh_big", whoosh(1.5, 150, 7000, q=1.0, shape=0.8))
    write("whoosh_soft", whoosh(1.1, 250, 2200, q=0.9), peak=0.6)
    write("whoosh_rev", whoosh(1.0, 6000, 300, q=1.2, pan=(0.6, -0.6)))
    write("key_click", key_click())
    write("mouse_click", mouse_click())
    write("impact", impact())
    write("braam", braam())
    write("riser", riser())
    write("blip", blip(1320))
    write("blip_lo", blip(660))
    write("blip_hi", blip(2093, 0.07))
    write("data", data_chatter())
    write("data_long", data_chatter(1.6, 30, seed=8))
    write("tick", tick(), peak=0.5)
    write("tick_hi", tick(5200, 0.025), peak=0.45)
    write("zap", zap())
    write("alarm", alarm())
    write("glitch", glitch())
    write("pop", pop())
    write("pop_hi", pop(880))
    write("shimmer", shimmer())
    write("chime", chime())
    write("chime_lo", chime(523.25))
    write("boom_soft", boom_soft())
    write("sweep_up", sweep(True))
    write("sweep_down", sweep(False))
    write("hum", hum())
    write("clock_tick", clock_tick())
    write("power_up", power(True))
    write("power_down", power(False))
    write("scan", scan())
    write("bounce", bounce())
    write("thud", thud())
    write("portal", portal())
    write("swell", swell())
    write("typing", typing())
    write("pulse", heartbeat_pulse())
    write("electrons", electrons())


if __name__ == "__main__":
    main()
