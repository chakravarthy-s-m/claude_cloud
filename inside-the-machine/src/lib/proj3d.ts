// A tiny vector "3D engine": project world-space geometry to 2D and draw it
// as crisp SVG. Flat-shaded boxes, planes, lines and anchors give a sleek
// keynote-illustration look and render far faster than software WebGL.
//
// World: X → right, Y → away from viewer (ground plane), Z → up.

export type V3 = [number, number, number];

export type Cam = {
  /** orbit angle around Z, degrees */
  yaw: number;
  /** elevation above the ground plane, degrees (90 = top-down) */
  pitch: number;
  /** perspective distance in world units (Infinity = orthographic) */
  dist: number;
  /** pixels per world unit */
  scale: number;
  /** screen center */
  cx: number;
  cy: number;
  /** look-at point */
  target: V3;
};

export const cam = (o: Partial<Cam> = {}): Cam => ({
  yaw: -35,
  pitch: 32,
  dist: 2400,
  scale: 1,
  cx: 960,
  cy: 540,
  target: [0, 0, 0],
  ...o,
});

const D2R = Math.PI / 180;

export type P2 = { x: number; y: number; depth: number; k: number };

const toView = (c: Cam, p: V3): V3 => {
  const x0 = p[0] - c.target[0];
  const y0 = p[1] - c.target[1];
  const z0 = p[2] - c.target[2];
  const a = c.yaw * D2R;
  const x = x0 * Math.cos(a) - y0 * Math.sin(a);
  const y = x0 * Math.sin(a) + y0 * Math.cos(a);
  const e = c.pitch * D2R;
  const up = y * Math.sin(e) + z0 * Math.cos(e);
  const depth = y * Math.cos(e) - z0 * Math.sin(e);
  return [x, up, depth];
};

export const project = (c: Cam, p: V3): P2 => {
  const [sx, su, depth] = toView(c, p);
  const k = Number.isFinite(c.dist) ? c.dist / Math.max(1, c.dist + depth) : 1;
  return { x: c.cx + sx * c.scale * k, y: c.cy - su * c.scale * k, depth, k };
};

/** Direction (unit) a world normal faces in view space; z<0 means toward camera. */
const viewNormal = (c: Cam, n: V3): V3 => {
  const a = c.yaw * D2R;
  const x = n[0] * Math.cos(a) - n[1] * Math.sin(a);
  const y = n[0] * Math.sin(a) + n[1] * Math.cos(a);
  const e = c.pitch * D2R;
  return [x, y * Math.sin(e) + n[2] * Math.cos(e), y * Math.cos(e) - n[2] * Math.sin(e)];
};

// ---------------------------------------------------------------- color
const parseHex = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** k < 1 darkens toward `dark`, k > 1 lightens toward white. */
export const shade = (hex: string, k: number, alpha = 1) => {
  const [r, g, b] = parseHex(hex);
  let R: number, G: number, B: number;
  if (k <= 1) {
    R = r * k + 6 * (1 - k);
    G = g * k + 8 * (1 - k);
    B = b * k + 18 * (1 - k);
  } else {
    const t = Math.min(1, k - 1);
    R = r + (255 - r) * t;
    G = g + (255 - g) * t;
    B = b + (255 - b) * t;
  }
  return `rgba(${R | 0}, ${G | 0}, ${B | 0}, ${alpha})`;
};

// ---------------------------------------------------------------- faces
export type Face = {
  pts: V3[];
  normal: V3;
  color: string; // hex
  alpha?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeAlpha?: number;
  /** extra light multiplier, e.g. emissive highlight */
  glow?: number;
  /** painter's sort bias (positive = drawn later / on top) */
  bias?: number;
  /** group key for sorting whole objects together */
  group?: number;
  id?: string;
  /** render back faces too (for open/glass planes) */
  twoSided?: boolean;
  /** explicit draw layer: lower layers are always drawn first */
  layer?: number;
};

export type Light = { dir: V3; ambient: number; diffuse: number };
export const DEFAULT_LIGHT: Light = { dir: [-0.45, -0.6, 0.9], ambient: 0.42, diffuse: 0.75 };

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export type DrawnFace = Face & { d: string; depth: number; fill: string; visible: boolean; screen: P2[] };

export const prepareFaces = (c: Cam, faces: Face[], light: Light = DEFAULT_LIGHT): DrawnFace[] => {
  const L = norm(light.dir);
  const out: DrawnFace[] = [];
  for (const f of faces) {
    const vn = viewNormal(c, f.normal);
    const facing = vn[2] < 0.02;
    if (!facing && !f.twoSided) continue;
    const screen = f.pts.map((p) => project(c, p));
    const depth = screen.reduce((s, p) => s + p.depth, 0) / screen.length;
    const n = norm(f.normal);
    const lambert = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
    const k = (light.ambient + light.diffuse * lambert) * (f.glow ?? 1);
    out.push({
      ...f,
      depth: depth - (f.bias ?? 0),
      visible: true,
      screen,
      fill: shade(f.color, k, f.alpha ?? 1),
      d: "M" + screen.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join("L") + "Z",
    });
  }
  // far → near (painter's algorithm); groups sort by their mean depth
  const groupDepth = new Map<number, number>();
  const groupCount = new Map<number, number>();
  for (const f of out) {
    if (f.group === undefined) continue;
    groupDepth.set(f.group, (groupDepth.get(f.group) ?? 0) + f.depth);
    groupCount.set(f.group, (groupCount.get(f.group) ?? 0) + 1);
  }
  const key = (f: DrawnFace) =>
    f.group === undefined ? f.depth : groupDepth.get(f.group)! / groupCount.get(f.group)!;
  out.sort((a, b) => {
    const la = a.layer ?? 0;
    const lb = b.layer ?? 0;
    if (la !== lb) return la - lb;
    const ka = key(a);
    const kb = key(b);
    if (Math.abs(ka - kb) > 1e-6) return kb - ka;
    return b.depth - a.depth;
  });
  return out;
};

// ---------------------------------------------------------------- shapes
/** Axis-aligned box: center c (x,y at center, z at BOTTOM), size s. Bottom face omitted. */
export const box = (
  c: V3,
  s: V3,
  color: string,
  o: Partial<Face> & { top?: string; topGlow?: number; sideAlpha?: number } = {},
): Face[] => {
  const [x, y, z] = c;
  const [w, d, h] = [s[0] / 2, s[1] / 2, s[2]];
  const p = (dx: number, dy: number, dz: number): V3 => [x + dx, y + dy, z + dz];
  const base = { ...o } as Partial<Face>;
  delete (base as Record<string, unknown>).top;
  return [
    { ...base, color: o.top ?? color, glow: (o.glow ?? 1) * (o.topGlow ?? 1), normal: [0, 0, 1], pts: [p(-w, -d, h), p(w, -d, h), p(w, d, h), p(-w, d, h)] } as Face,
    { ...base, color, alpha: o.sideAlpha ?? o.alpha, normal: [0, -1, 0], pts: [p(-w, -d, 0), p(w, -d, 0), p(w, -d, h), p(-w, -d, h)] } as Face,
    { ...base, color, alpha: o.sideAlpha ?? o.alpha, normal: [0, 1, 0], pts: [p(w, d, 0), p(-w, d, 0), p(-w, d, h), p(w, d, h)] } as Face,
    { ...base, color, alpha: o.sideAlpha ?? o.alpha, normal: [-1, 0, 0], pts: [p(-w, d, 0), p(-w, -d, 0), p(-w, -d, h), p(-w, d, h)] } as Face,
    { ...base, color, alpha: o.sideAlpha ?? o.alpha, normal: [1, 0, 0], pts: [p(w, -d, 0), p(w, d, 0), p(w, d, h), p(w, -d, h)] } as Face,
  ];
};

/** Horizontal plane at height z. */
export const plane = (c: V3, w: number, d: number, color: string, o: Partial<Face> = {}): Face => {
  const [x, y, z] = c;
  return {
    color,
    normal: [0, 0, 1],
    twoSided: true,
    ...o,
    pts: [
      [x - w / 2, y - d / 2, z],
      [x + w / 2, y - d / 2, z],
      [x + w / 2, y + d / 2, z],
      [x - w / 2, y + d / 2, z],
    ],
  };
};

/** Screen-space polyline for a 3D path. */
export const pathD = (c: Cam, pts: V3[]) =>
  pts
    .map((p, i) => {
      const s = project(c, p);
      return `${i ? "L" : "M"}${s.x.toFixed(1)},${s.y.toFixed(1)}`;
    })
    .join("");

// ---------------------------------------------------------------- outlines & extrusion
export type P2D = [number, number];

/** Rounded rectangle outline, counter-clockwise (in X/Y world plane). */
export const roundRect = (cx: number, cy: number, w: number, h: number, r: number, seg = 5): P2D[] => {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  const pts: P2D[] = [];
  const corners: [number, number, number][] = [
    [cx + w / 2 - rr, cy - h / 2 + rr, -90],
    [cx + w / 2 - rr, cy + h / 2 - rr, 0],
    [cx - w / 2 + rr, cy + h / 2 - rr, 90],
    [cx - w / 2 + rr, cy - h / 2 + rr, 180],
  ];
  for (const [x, y, a0] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = ((a0 + (90 * i) / seg) * Math.PI) / 180;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
  }
  return pts;
};

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/**
 * Extrude a CCW outline from z0 up to z0+h. `inset` tapers the top (keycap look).
 * Returns top + side faces (bottom omitted). All faces share `group` for sorting.
 */
export const extrude = (
  outline: P2D[],
  z0: number,
  h: number,
  color: string,
  o: Partial<Face> & { inset?: number; topColor?: string; topGlow?: number; center?: P2D } = {},
): Face[] => {
  const n = outline.length;
  const cx = o.center?.[0] ?? outline.reduce((s, p) => s + p[0], 0) / n;
  const cy = o.center?.[1] ?? outline.reduce((s, p) => s + p[1], 0) / n;
  const inset = o.inset ?? 0;
  const top: V3[] = outline.map(([x, y]) => {
    const dx = x - cx;
    const dy = y - cy;
    const l = Math.hypot(dx, dy) || 1;
    return [x - (dx / l) * inset, y - (dy / l) * inset, z0 + h];
  });
  const bot: V3[] = outline.map(([x, y]) => [x, y, z0]);
  const { inset: _i, topColor, topGlow, center: _c, ...rest } = o;
  const faces: Face[] = [
    { ...rest, color: topColor ?? color, glow: (rest.glow ?? 1) * (topGlow ?? 1), normal: [0, 0, 1], pts: top },
  ];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const a = bot[i];
    const b = bot[j];
    const c = top[j];
    const d = top[i];
    let nr = cross(sub(b, a), sub(d, a));
    // ensure outward
    const mx = (a[0] + b[0]) / 2 - cx;
    const my = (a[1] + b[1]) / 2 - cy;
    if (nr[0] * mx + nr[1] * my < 0) nr = [-nr[0], -nr[1], -nr[2]];
    faces.push({ ...rest, color, normal: nr, pts: [a, b, c, d] });
  }
  return faces;
};

/** Rotate points/normals of faces about the X axis through pivot (degrees). */
export const rotateFacesX = (faces: Face[], deg: number, pivot: V3): Face[] => {
  const a = (deg * Math.PI) / 180;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const rp = (p: V3): V3 => {
    const y = p[1] - pivot[1];
    const z = p[2] - pivot[2];
    return [p[0], pivot[1] + y * ca - z * sa, pivot[2] + y * sa + z * ca];
  };
  const rn = (v: V3): V3 => [v[0], v[1] * ca - v[2] * sa, v[1] * sa + v[2] * ca];
  return faces.map((f) => ({ ...f, pts: f.pts.map(rp), normal: rn(f.normal) }));
};

export const translateFaces = (faces: Face[], d: V3): Face[] =>
  faces.map((f) => ({ ...f, pts: f.pts.map((p) => [p[0] + d[0], p[1] + d[1], p[2] + d[2]] as V3) }));

/**
 * SVG affine matrix that maps local 2D coords (u right, v down) onto a 3D plane
 * spanned by origin + u*U + v*V. Exact for orthographic, close for mild perspective.
 */
export const planeMatrix = (c: Cam, origin: V3, U: V3, V: V3) => {
  const o = project(c, origin);
  const pu = project(c, [origin[0] + U[0], origin[1] + U[1], origin[2] + U[2]]);
  const pv = project(c, [origin[0] + V[0], origin[1] + V[1], origin[2] + V[2]]);
  return `matrix(${(pu.x - o.x).toFixed(4)},${(pu.y - o.y).toFixed(4)},${(pv.x - o.x).toFixed(4)},${(pv.y - o.y).toFixed(4)},${o.x.toFixed(2)},${o.y.toFixed(2)})`;
};

/** Matrix for a horizontal plane at height z: local (u,v) → world (x0+u, y0−v, z). */
export const groundMatrix = (c: Cam, x0: number, y0: number, z: number) =>
  planeMatrix(c, [x0, y0, z], [1, 0, 0], [0, -1, 0]);

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const neg = (a: V3): V3 => [-a[0], -a[1], -a[2]];

/** Parallelepiped spanned from corner o by edge vectors U (width), V (height), W (thickness). */
export const pbox = (o: V3, U: V3, V: V3, W: V3, color: string, extra: Partial<Face> = {}): Face[] => {
  const p000 = o;
  const p100 = add(o, U);
  const p010 = add(o, V);
  const p110 = add(p100, V);
  const p001 = add(o, W);
  const p101 = add(p100, W);
  const p011 = add(p010, W);
  const p111 = add(p110, W);
  const nW = cross(U, V); // normal of the face spanned by U,V (front, at o)
  const nU = cross(V, W);
  const nV = cross(W, U);
  // orient: front face (o-plane) normal points away from W
  const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const front = dot(nW, W) > 0 ? neg(nW) : nW;
  const side = dot(nU, U) > 0 ? nU : neg(nU);
  const topN = dot(nV, V) > 0 ? nV : neg(nV);
  return [
    { ...extra, color, normal: front, pts: [p000, p100, p110, p010] },
    { ...extra, color, normal: neg(front), pts: [p001, p011, p111, p101] },
    { ...extra, color, normal: neg(side), pts: [p000, p010, p011, p001] },
    { ...extra, color, normal: side, pts: [p100, p101, p111, p110] },
    { ...extra, color, normal: neg(topN), pts: [p000, p001, p101, p100] },
    { ...extra, color, normal: topN, pts: [p010, p110, p111, p011] },
  ];
};
