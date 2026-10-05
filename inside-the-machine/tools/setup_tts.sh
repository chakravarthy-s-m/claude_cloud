#!/usr/bin/env bash
# Sets up the local, offline narration engine (Kokoro-82M, Apache-2.0).
# Weights come from the npm registry (kokoro-q8-shards = onnx-community
# model_quantized.onnx split in 6 parts; kokoro-js ships the voice packs),
# so no HuggingFace access is needed.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p models .tmp
if [ ! -d .venv ]; then
  python3 -m venv .venv
fi
./.venv/bin/pip install -q --upgrade pip
./.venv/bin/pip install -q -r requirements.txt

if [ ! -f models/kokoro-q8.onnx ]; then
  curl -sSL -o .tmp/shards.tgz https://registry.npmjs.org/kokoro-q8-shards/-/kokoro-q8-shards-1.0.0.tgz
  tar xzf .tmp/shards.tgz -C .tmp
  cat .tmp/package/kokoro-q8.part{0,1,2,3,4,5}.bin > models/kokoro-q8.onnx
  echo "fbae9257e1e05ffc727e951ef9b9c98418e6d79f1c9b6b13bd59f5c9028a1478  models/kokoro-q8.onnx" | sha256sum -c -
fi
if [ ! -f models/voices.npz ]; then
  curl -sSL -o .tmp/kokoro-js.tgz https://registry.npmjs.org/kokoro-js/-/kokoro-js-1.2.1.tgz
  tar xzf .tmp/kokoro-js.tgz -C .tmp
  ./.venv/bin/python - <<'PY'
import glob, os
import numpy as np
voices = {}
for f in sorted(glob.glob('.tmp/package/voices/*.bin')):
    voices[os.path.basename(f)[:-4]] = np.fromfile(f, dtype=np.float32).reshape(-1, 1, 256)
np.savez('models/voices.npz', **voices)
print(f"packed {len(voices)} voices")
PY
fi
rm -rf .tmp
echo "TTS ready."
