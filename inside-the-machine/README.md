# INSIDE THE MACHINE

**A cinematic explainer series about how computers really work — built entirely in code.**

![Episode 01 — From Keystroke to Electron](docs/ep01-thumbnail.jpg)

Episode 01 — **From Keystroke → Electron: How a modern Mac really works** (≈ 11 min, 1080p30)

You press one key. We follow that press through every layer of a modern Apple‑silicon Mac — the key matrix, the
HID report, the interrupt, the kernel, the WindowServer, the app's run loop, Unicode, font outlines, rasterization,
the tile‑based GPU and the display's subpixels — then open an app (processes, virtual memory, page faults, the P/E‑core
scheduler), save a file (system calls, APFS, 3D NAND, charge‑trap cells) and finally dive all the way down: Swift →
ARM64 machine code → the out‑of‑order core → the adder → logic gates → CMOS → a 3D FinFET → electrons and the clock.

| | |
|---|---|
| **Narration** | Kokoro‑82M neural TTS (voice `af_heart`), fully offline, phoneme‑level pronunciation fixes |
| **Music** | Original score, procedurally synthesized and **timeline‑aware** (mood per chapter, ducked under the voice) |
| **Sound design** | 39 procedurally synthesized SFX (whooshes, clicks, impacts, data chatter, zaps, clock ticks…) |
| **Visuals** | Remotion + a custom SVG "mini‑3D" engine (flat‑shaded extrusions, keynote‑style) + three.js for the hero FinFET |
| **Captions** | `episodes/ep01/captions.srt` (generated from the narration timeline) |

---

## Why Remotion (vs. HyperFrames)?

Both render web pages to video. HyperFrames (HeyGen, v0.8, Apache‑2.0) is a young, HTML‑first composition tool, but
this series needs **frame‑exact, data‑driven scenes** (cue‑synced animation, procedural geometry, three.js/WebGL, per‑frame
audio placement, chaptered segment rendering). Remotion 4 is mature at exactly that: React components as a pure
function of `frame`, `<Sequence>` timing, `@remotion/three`, and a programmatic renderer (`renderMedia`) that lets us
render each scene as an independent, resumable segment.

> Remotion is free for individuals and companies with ≤ 3 people; larger companies need a
> [company license](https://www.remotion.dev/license).

---

## Quick start

```bash
cd inside-the-machine
npm install

npm run studio            # live preview: "Ep01" + every scene as its own composition (Ep01-Scenes/…)
node tools/render.mjs     # production render → out/ep01-keystroke-to-electron.mp4
```

`remotion.config.ts` points Remotion at a local Chromium headless shell if one exists; otherwise Remotion downloads
its own.

> **Performance tip (CPU‑only machines):** use `--gl=angle` (the default here). With `--gl=swangle` Chrome routes *all*
> compositing through software GL and renders ~6× slower (0.7 → 4+ fps at 1080p on 4 cores). WebGL still works under
> `angle` (it falls back to SwiftShader), so the three.js FinFET scene renders identically.

### Production render

`tools/render.mjs` bundles once, renders **each scene as its own H.264 segment** (skips segments that already exist, so
you can fix one scene and re‑render just that: `node tools/render.mjs --only=finfet`), renders the soundtrack once
(narration + score + SFX), then concatenates the segments and muxes the audio with EBU R128 loudness normalization
(−16 LUFS, −1.5 dBTP).

Useful flags: `--scale=0.5` (fast 540p draft), `--crf=18`, `--concurrency=4`, `--force`, `--only=a,b`.

Quick previews of single frames: `node tools/stills.mjs ep01-finfet:120,600 Ep01:3920` → `out/stills/`.

Delivery encodes (shareable 1080p + 720p preview + storyboard) from the master: `tools/deliver.sh`;
two < 30 MiB 720p halves for chat/upload limits: `tools/share.sh`.
Speed experiments: `GL=angle node tools/bench.mjs <fromFrame> <count> '{}' '{"noGrain":true}'` (flags in `src/components/core.tsx`).

---

## Audio pipeline

All audio is generated locally — no stock assets, no cloud APIs.

```bash
tools/setup_tts.sh                                   # one‑time: Python venv + Kokoro weights (from the npm registry)
tools/.venv/bin/python tools/tts.py ep01             # narration → public/audio/narration/ep01 + src/episodes/ep01/timeline.json + captions.srt
tools/.venv/bin/python tools/sfx.py                  # SFX library → public/audio/sfx
tools/.venv/bin/python tools/music.py ep01           # score (reads the timeline) → public/audio/music/ep01-score.mp3
```

* **Narration** — the script lives in `episodes/ep01/script.json` as scenes of short *cue lines*. Each line is voiced
  separately (cached by hash — edit one line, only that line is re‑voiced), loudness‑leveled, then laid out on a
  frame‑accurate timeline. Scenes animate against cue frames (`cueMap`) and even individual words (`wordAt`), so
  visuals land exactly on the narration. `say` overrides spoken text; inline `[word](/ipa/)` forces pronunciation.
  Change voice/speed with `--voice am_michael --speed 1.0` (54 voices available).
* **Score** — D‑minor, 120 BPM, synthesized from saw‑stack pads, sub bass, triangle plucks, FM bells and light drums
  with convolution reverb. Each scene gets a mood (`mystery → build → hit → wonder → drive → flow → deep → descent →
  awe → tick → finale`), sections crossfade, the final chord resolves to D major, and the whole score is
  **side‑chain ducked** (~9 dB) wherever the narration is speaking.
* **SFX** — `tools/sfx.py` builds every effect from oscillators, filtered noise, FM and synthetic reverb; scenes place
  them on exact frames next to the visuals that cause them.

The Kokoro weights are the onnx‑community `model_quantized.onnx` (Apache‑2.0), fetched from the npm package
`kokoro-q8-shards` (sha256‑verified) and voices from `kokoro-js` — useful when HuggingFace is not reachable.

---

## Project structure

```
inside-the-machine/
├─ episodes/ep01/script.json      ← the narration script (source of truth for timing)
├─ episodes/ep01/captions.srt     ← generated subtitles
├─ src/
│  ├─ Root.tsx                    ← compositions: Ep01 + one per scene
│  ├─ theme.ts                    ← "Obsidian Neon" design tokens
│  ├─ lib/
│  │  ├─ anim.ts                  ← easing, springs, keyframes, deterministic random
│  │  ├─ timeline.ts              ← cue/word timing helpers
│  │  └─ proj3d.ts                ← tiny vector 3D engine (camera, boxes, extrusions, plane mapping) → SVG
│  ├─ components/                 ← Backdrop, Camera, Glass, NeonPath, ChapterCard, HUD, Keyboard3D, MacBook3D,
│  │                                 Chip3D (SoC floorplan), Stack3D, logic gates, canvas FX, Episode assembler
│  ├─ scenes/ep01/                ← 16 scenes (ColdOpen … Finale); each exports Visual + sfx() + backdrop
│  └─ episodes/ep01/              ← timeline.json + scene registry
├─ public/audio/                  ← narration, sfx, music
└─ tools/                         ← tts.py, sfx.py, music.py, glyph.py, render.mjs, stills.mjs
```

### Design language — "Obsidian Neon"

Near‑black glass backgrounds with drifting aurora light, a dot grid, parallax dust and film grain; one accent color
per abstraction layer used consistently through the series — **apps** pink · **frameworks** violet · **services** blue ·
**kernel** cyan · **hardware** green · **electrons** amber · **alerts** rose. Typography: Space Grotesk (display),
Inter (UI), JetBrains Mono (code/bits). Motion is spring‑based with a slow "breathing" camera, word‑by‑word reveals,
light sweeps at chapter boundaries and a depth gauge that tracks how far down the stack we are.

---

## Episode 01 — chapters

![Storyboard: 16 moments from Episode 01](docs/ep01-storyboard.jpg)

| # | Chapter | What you see |
|---|---|---|
| 00 | Prologue | 3D keyboard macro shot, the 1 mm keypress, light racing across the deck, montage, title |
| 01 | The Machine | MacBook teardown → Apple‑silicon floorplan rising like a city → 28 billion transistors → the software stack, abstraction, user vs. kernel mode (EL0/EL1) |
| 02 | A Single Keystroke | key‑matrix scanning, contact bounce, 8‑byte HID report (`0x04` = A), interrupt → exception vector, I/O Kit, WindowServer, run loop, `a` = U+0061 = `0x61` = `01100001`, Bézier outline → antialiased pixels, tile‑based GPU, 120 Hz scanout, RGB subpixels |
| 03 | Opening an App | process creation, virtual address space, MMU + 16 KB pages, a live page fault served from the SSD, QoS‑driven P/E‑core scheduling |
| 04 | Saving a File | the wall, `mov x16, #4` / `svc #0x80`, the syscall table, APFS copy‑on‑write, 3D NAND, charge‑trap cells and 8 voltage levels = 3 bits, `eret` |
| 05 | Down the Rabbit Hole | Swift → SIL → LLVM IR → ARM64, `adds x0, x0, #1` = `0xB1000400` decoded bit‑field by bit‑field, little‑endian bytes, the decoder, an 8‑wide out‑of‑order core, the ALU, full adder gates, carry‑lookahead, NAND universality, CMOS NAND, a 3D FinFET with flowing electrons, atoms across a fin, 24 MHz crystal → PLL → 4+ GHz, light travels ~7 cm per tick |
| 06 | Rising Back Up | powers‑of‑ten zoom out, the whole stack lit, sand → wafer → Mac, next‑episode teaser |

### Fact notes

Numbers are chosen to be defensible and are stated approximately on screen:
M4 ≈ 28 billion transistors (Apple); TSMC 3 nm‑class nodes still use FinFETs; Apple‑silicon macOS uses 16 KB pages;
BSD `write` is syscall 4, issued with `svc #0x80` and the number in `x16`; HID usage ID `0x04` = A; `kVK_ANSI_A` = 0;
`adds x0, x0, #1` encodes to `0xB1000400` (stored `00 04 00 B1`); IRQ from EL0/AArch64 vectors to `VBAR_EL1 + 0x480`;
the Apple‑silicon timebase is 24 MHz; at ~4.3 GHz one cycle ≈ 0.23 ns, in which light travels ≈ 7 cm.
The SoC floorplan and FinFET are **illustrative**, not die shots or exact process geometry.

---

## Series roadmap

| Ep | Title | Down to… |
|---|---|---|
| 01 | From Keystroke → Electron | the whole stack, one keypress at a time ✅ |
| 02 | Painting with Light | Metal, tile‑based deferred rendering, display engines, mini‑LED backlights, subpixels → photons |
| 03 | Power On | Boot ROM → iBoot → Secure Enclave → XNU → launchd → login window |
| 04 | Memory | caches, coherency, unified memory, DRAM cells & refresh, page tables in depth |
| 05 | Storage | APFS internals, NVMe queues, wear leveling, ECC, how flash cells wear out |
| 06 | The Neural Engine | matrix math on silicon, int8/fp16, how a prompt becomes multiply‑accumulates |
| 07 | Packets | Wi‑Fi radios, OFDM, TCP/IP in the kernel, TLS — a web page arrives |
| 08 | Power & Heat | DVFS, P/E cores, voltage regulators, the battery's chemistry |
| 09 | Secrets | Secure Enclave, Touch ID, AES engines, signed boot |
| 10 | Sound | Core Audio, DACs, class‑D amps, speaker cones moving air |

Adding an episode: write `episodes/epNN/script.json`, run the three audio tools, add `src/scenes/epNN/*`, register
`src/episodes/epNN/index.tsx` in `Root.tsx`, render with `node tools/render.mjs --comp=EpNN --ep=epNN`.

### Inspiration

The craft bar is set by channels like **Branch Education** (photoreal 3D hardware teardowns), **Core Dumped** (OS
internals made visual), **3Blue1Brown** (programmatic animation), **Kurzgesagt** (color & pacing), **Sebastian Lague**
and **Ben Eater** (from first principles), **Veritasium** (wonder) and **Asianometry** (semiconductors).

---

## Licenses & credits

Third‑party: Kokoro‑82M weights — Apache‑2.0. Fonts (Inter, Space Grotesk, JetBrains Mono):
SIL OFL 1.1 via Fontsource. three.js: MIT. Remotion: see its license above. Music and SFX are original, generated by the
scripts in `tools/`. Mac, macOS and Apple silicon are trademarks of Apple Inc.; this is an independent educational work
and is not affiliated with or endorsed by Apple.
