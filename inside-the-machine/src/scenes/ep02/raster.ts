// A tiny software rasterizer (z-buffer, per-pixel Blinn-Phong) used to show the
// teapot being rendered at different resolutions — the same three steps a GPU
// runs: project vertices, find covered pixels, shade each one.
import * as THREE from "three";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";

type Mesh = { pos: Float32Array; nor: Float32Array; idx: ArrayLike<number> };
let MESH: Mesh | null = null;
const mesh = (): Mesh => {
  if (MESH) return MESH;
  const g = new TeapotGeometry(1, 8);
  g.translate(-0.14, 0, 0);
  MESH = {
    pos: Float32Array.from((g.getAttribute("position") as THREE.BufferAttribute).array as Float32Array),
    nor: Float32Array.from((g.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array),
    idx: Array.from(g.index!.array as ArrayLike<number>),
  };
  return MESH;
};

export type RasterOpts = { yaw?: number; elev?: number; dist?: number; bg?: [number, number, number, number] };

const norm3 = (x: number, y: number, z: number): [number, number, number] => {
  const l = Math.hypot(x, y, z) || 1;
  return [x / l, y / l, z / l];
};

const LIGHTS: { d: [number, number, number]; c: [number, number, number]; spec: number }[] = [
  { d: norm3(0.45, 0.8, 0.6), c: [1.0, 0.95, 0.88], spec: 1 },
  { d: norm3(-0.85, 0.3, -0.5), c: [0.13, 0.83, 0.93], spec: 0.8 },
  { d: norm3(0.85, 0.2, -0.55), c: [0.96, 0.45, 0.71], spec: 0.8 },
];

const cache = new Map<string, ImageData>();

/** Render the teapot into an RGBA buffer of W×H pixels (cached per size). */
export const rasterTeapot = (W: number, H: number, o: RasterOpts = {}): ImageData => {
  const key = `${W}x${H}:${o.yaw ?? 0.35}:${o.elev ?? 0.32}:${o.dist ?? 8.4}:${(o.bg ?? []).join(",")}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const m = mesh();
  const yaw = o.yaw ?? 0.35;
  const elev = o.elev ?? 0.32;
  const dist = o.dist ?? 8.4;
  const cam = new THREE.PerspectiveCamera(30, W / H, 0.1, 100);
  const target = new THREE.Vector3(0, 0.1, 0);
  cam.position.set(Math.sin(yaw) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, Math.cos(yaw) * Math.cos(elev) * dist);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const n = m.pos.length / 3;
  const sx = new Float32Array(n);
  const sy = new Float32Array(n);
  const sz = new Float32Array(n);
  const v = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    v.set(m.pos[i * 3], m.pos[i * 3 + 1], m.pos[i * 3 + 2]).project(cam);
    sx[i] = (v.x * 0.5 + 0.5) * W;
    sy[i] = (-v.y * 0.5 + 0.5) * H;
    sz[i] = v.z;
  }
  const zb = new Float32Array(W * H).fill(Infinity);
  const img = new ImageData(W, H);
  const out = img.data;
  const bg = o.bg ?? [0, 0, 0, 0];
  for (let p = 0; p < W * H; p++) {
    out[p * 4] = bg[0];
    out[p * 4 + 1] = bg[1];
    out[p * 4 + 2] = bg[2];
    out[p * 4 + 3] = bg[3];
  }
  const view = norm3(cam.position.x - target.x, cam.position.y - target.y, cam.position.z - target.z);
  const idx = m.idx;
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t];
    const b = idx[t + 1];
    const c = idx[t + 2];
    const area = (sx[b] - sx[a]) * (sy[c] - sy[a]) - (sy[b] - sy[a]) * (sx[c] - sx[a]);
    if (Math.abs(area) < 1e-9) continue;
    const x0 = Math.max(0, Math.floor(Math.min(sx[a], sx[b], sx[c])));
    const x1 = Math.min(W - 1, Math.ceil(Math.max(sx[a], sx[b], sx[c])));
    const y0 = Math.max(0, Math.floor(Math.min(sy[a], sy[b], sy[c])));
    const y1 = Math.min(H - 1, Math.ceil(Math.max(sy[a], sy[b], sy[c])));
    for (let py = y0; py <= y1; py++) {
      const Y = py + 0.5;
      for (let px = x0; px <= x1; px++) {
        const X = px + 0.5;
        const w0 = ((sx[c] - sx[b]) * (Y - sy[b]) - (sy[c] - sy[b]) * (X - sx[b])) / area;
        const w1 = ((sx[a] - sx[c]) * (Y - sy[c]) - (sy[a] - sy[c]) * (X - sx[c])) / area;
        const w2 = 1 - w0 - w1;
        if (w0 < 0 || w1 < 0 || w2 < 0) continue;
        const z = w0 * sz[a] + w1 * sz[b] + w2 * sz[c];
        const pi = py * W + px;
        if (z >= zb[pi]) continue;
        zb[pi] = z;
        let nx = w0 * m.nor[a * 3] + w1 * m.nor[b * 3] + w2 * m.nor[c * 3];
        let ny = w0 * m.nor[a * 3 + 1] + w1 * m.nor[b * 3 + 1] + w2 * m.nor[c * 3 + 1];
        let nz = w0 * m.nor[a * 3 + 2] + w1 * m.nor[b * 3 + 2] + w2 * m.nor[c * 3 + 2];
        const nl = Math.hypot(nx, ny, nz) || 1;
        nx /= nl;
        ny /= nl;
        nz /= nl;
        // flip normals that face away (open lid/spout seams)
        if (nx * view[0] + ny * view[1] + nz * view[2] < -0.2) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        let r = 0.07;
        let g = 0.08;
        let bl = 0.12;
        for (const L of LIGHTS) {
          const d = Math.max(0, nx * L.d[0] + ny * L.d[1] + nz * L.d[2]);
          const hx = L.d[0] + view[0];
          const hy = L.d[1] + view[1];
          const hz = L.d[2] + view[2];
          const hl = Math.hypot(hx, hy, hz) || 1;
          const sp = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hl), 60) * L.spec;
          r += L.c[0] * (d * 0.82 + sp);
          g += L.c[1] * (d * 0.86 + sp);
          bl += L.c[2] * (d * 0.95 + sp);
        }
        const o4 = pi * 4;
        out[o4] = 255 * (1 - Math.exp(-r * 1.15));
        out[o4 + 1] = 255 * (1 - Math.exp(-g * 1.15));
        out[o4 + 2] = 255 * (1 - Math.exp(-bl * 1.15));
        out[o4 + 3] = 255;
      }
    }
  }
  cache.set(key, img);
  return img;
};

const canvasCache = new Map<string, HTMLCanvasElement>();
/** The rasterized teapot as a canvas (cached). */
export const teapotCanvas = (W: number, H: number, o: RasterOpts = {}) => {
  const key = `${W}x${H}:${o.yaw ?? 0.35}:${o.elev ?? 0.32}:${o.dist ?? 8.4}:${(o.bg ?? []).join(",")}`;
  const hit = canvasCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  c.getContext("2d")!.putImageData(rasterTeapot(W, H, o), 0, 0);
  canvasCache.set(key, c);
  return c;
};
