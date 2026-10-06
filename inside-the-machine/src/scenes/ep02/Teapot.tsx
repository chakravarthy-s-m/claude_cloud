import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { TeapotGeometry } from "three/examples/jsm/geometries/TeapotGeometry.js";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, spr } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";
import { Code, CodeWindow, type Tok } from "./shared";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    meet: c.t1.from,
    famous: wordAt(c.t1, "most famous teapot"),
    since: wordAt(c.t1, "nineteen seventy-five"),
    tri: c.t2.from,
    triangles: wordAt(c.t2, "nothing but triangles"),
    thousands: wordAt(c.t2, "thousands of them"),
    corners: wordAt(c.t2, "three corners"),
    vertices: wordAt(c.t2, "called vertices"),
    step1: c.t3.from,
    shader: wordAt(c.t3, "vertex shader"),
    every: wordAt(c.t3, "once for every corner"),
    moves: wordAt(c.t4, "It moves"),
    rotates: wordAt(c.t4, "rotates"),
    scales: wordAt(c.t4, "scales"),
    projects: wordAt(c.t4, "projects it"),
    flat: wordAt(c.t4, "flat screen"),
    nearer: wordAt(c.t4, "nearer things"),
    end: s.durationInFrames,
  };
};
type B = ReturnType<typeof beats>;

// ------------------------------------------------------------------ geometry (shared, mutated per frame)
type Tea = { geo: THREE.BufferGeometry; orig: Float32Array; origN: Float32Array; color: Float32Array; order: Float32Array; tri: number[] };
let TEA: Tea | null = null;
const tea = (): Tea => {
  if (TEA) return TEA;
  const geo = new TeapotGeometry(1, 8);
  geo.translate(-0.14, 0, 0);
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const n = pos.count;
  const orig = Float32Array.from(pos.array as Float32Array);
  const origN = Float32Array.from((geo.getAttribute("normal") as THREE.BufferAttribute).array as Float32Array);
  const color = new Float32Array(n * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(color, 3));
  // processing order for the vertex-shader sweep: top → bottom
  let ymin = Infinity;
  let ymax = -Infinity;
  for (let i = 0; i < n; i++) {
    ymin = Math.min(ymin, orig[i * 3 + 1]);
    ymax = Math.max(ymax, orig[i * 3 + 1]);
  }
  const order = new Float32Array(n);
  for (let i = 0; i < n; i++) order[i] = (ymax - orig[i * 3 + 1]) / (ymax - ymin) * 0.85 + ((i * 7919) % 97) / 97 * 0.15;
  // a front-facing triangle on the body, used for the "three corners" close-up
  const idx = geo.index!.array;
  let best = 0;
  let bestD = Infinity;
  const target = [-0.25, 0.25, 1.22];
  for (let t = 0; t < idx.length / 3; t++) {
    let cx = 0;
    let cy = 0;
    let cz = 0;
    for (let k = 0; k < 3; k++) {
      const v = idx[t * 3 + k];
      cx += orig[v * 3] / 3;
      cy += orig[v * 3 + 1] / 3;
      cz += orig[v * 3 + 2] / 3;
    }
    const d = (cx - target[0]) ** 2 + (cy - target[1]) ** 2 + (cz - target[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  }
  TEA = { geo, orig, origN, color, order, tri: [idx[best * 3], idx[best * 3 + 1], idx[best * 3 + 2]] };
  return TEA;
};

// the projection used to "flatten" the teapot onto a screen plane
const EYE = new THREE.Vector3(0, 0.55, 9.5);
const PLANE_Z = 3.0;

type Model = { tx: number; rot: number; scale: number; flat: number };
const modelAt = (f: number, b: B): Model => ({
  tx: keyframes(f, [[b.moves - 4, 0], [b.moves + 14, 0.7], [b.rotates + 4, 0.35], [b.projects - 10, 0]]),
  rot: keyframes(f, [[0, -0.9], [b.tri, -0.25], [b.corners - 20, -0.12], [b.rotates - 6, -0.12], [b.rotates + 22, 0.75], [b.scales + 6, 0.55], [b.projects, 0.35]]),
  scale: keyframes(f, [[b.scales - 6, 1], [b.scales + 8, 1.28], [b.scales + 26, 1]]),
  flat: prog(f, b.projects + 4, 46, EASE.inOut),
});

const worldOf = (x: number, y: number, z: number, m: Model): [number, number, number] => {
  const c = Math.cos(m.rot);
  const s = Math.sin(m.rot);
  const X = (x * c + z * s) * m.scale + m.tx;
  const Y = y * m.scale;
  const Z = (-x * s + z * c) * m.scale;
  if (m.flat <= 0) return [X, Y, Z];
  // project toward the eye onto the plane z = PLANE_Z, then blend
  const k = (PLANE_Z - EYE.z) / (Z - EYE.z);
  const PX = EYE.x + (X - EYE.x) * k;
  const PY = EYE.y + (Y - EYE.y) * k;
  return [mix(X, PX, m.flat), mix(Y, PY, m.flat), mix(Z, PLANE_Z, m.flat)];
};

// ------------------------------------------------------------------ camera
const camAt = (f: number, b: B) => {
  const yaw = keyframes(f, [[0, 0.5], [b.meet, 0.3], [b.tri, 0.12], [b.corners, 0.05], [b.vertices + 30, 0.0], [b.step1, -0.1], [b.moves, 0.0], [b.projects - 10, 0.15], [b.projects + 24, 1.0], [b.flat + 12, 1.05]]);
  const elev = keyframes(f, [[0, 0.32], [b.tri, 0.22], [b.corners, 0.14], [b.step1 + 14, 0.24], [b.projects, 0.2], [b.flat + 12, 0.26]]);
  const dist = keyframes(f, [[0, 11], [b.meet + 60, 8.2], [b.tri, 7.6], [b.corners - 2, 7.2], [b.vertices + 2, 2.7], [b.vertices + 34, 2.6], [b.step1 + 14, 8.2], [b.moves, 8.4], [b.projects, 9.2], [b.projects + 30, 12.5], [b.flat + 12, 12.5]]);
  const target = new THREE.Vector3(
    keyframes(f, [[b.corners - 2, 0], [b.vertices + 2, -0.39], [b.vertices + 34, -0.39], [b.step1 + 14, 1.05], [b.moves - 6, 1.05], [b.moves + 10, 0.2], [b.projects, 0.2], [b.projects + 30, 0.8], [b.flat + 12, 0.8]]),
    keyframes(f, [[0, 0.1], [b.corners - 2, 0.1], [b.vertices + 2, 0.25], [b.vertices + 34, 0.25], [b.step1 + 14, 0.1]]),
    keyframes(f, [[b.corners - 2, 0], [b.vertices + 2, 1.18], [b.vertices + 34, 1.18], [b.step1 + 14, 0], [b.projects, 0], [b.projects + 30, 1.6], [b.flat + 12, 1.6]]),
  );
  const pos = new THREE.Vector3(target.x + Math.sin(yaw) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, target.z + Math.cos(yaw) * Math.cos(elev) * dist);
  // finally: look through the glass from the eye's position — the flat picture looks 3D again
  const e = prog(f, b.flat + 12, Math.max(20, b.end - b.flat - 16), EASE.inOut);
  if (e > 0) {
    pos.lerp(new THREE.Vector3(EYE.x, EYE.y, EYE.z + 0.4), e);
    target.lerp(new THREE.Vector3(0, 0.25, PLANE_Z), e);
  }
  return { pos, target, fov: mix(30, 34, e) };
};

const makeCam = (f: number, b: B, w: number, h: number) => {
  const { pos, target, fov } = camAt(f, b);
  const cam = new THREE.PerspectiveCamera(fov, w / h, 0.1, 200);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld();
  return cam;
};

const toScreen = (p: [number, number, number], cam: THREE.PerspectiveCamera, w: number, h: number) => {
  const v = new THREE.Vector3(...p).project(cam);
  return { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, front: v.z < 1 };
};

const CamRig: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const { camera } = useThree();
  const { pos, target, fov } = camAt(f, b);
  const cam = camera as THREE.PerspectiveCamera;
  cam.position.copy(pos);
  cam.fov = fov;
  cam.near = 0.1;
  cam.far = 200;
  cam.lookAt(target);
  cam.updateProjectionMatrix();
  return null;
};

const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.55;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
  }, [gl, scene]);
  return null;
};

const glowTex = (() => {
  let t: THREE.Texture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.25, "rgba(255,255,255,0.9)");
    grd.addColorStop(0.55, "rgba(255,255,255,0.2)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    t = new THREE.CanvasTexture(c);
    return t;
  };
})();

const TeapotModel: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const T = tea();
  const m = modelAt(f, b);
  const pos = T.geo.getAttribute("position") as THREE.BufferAttribute;
  const nor = T.geo.getAttribute("normal") as THREE.BufferAttribute;
  const col = T.geo.getAttribute("color") as THREE.BufferAttribute;
  const n = pos.count;
  const c = Math.cos(m.rot);
  const s = Math.sin(m.rot);
  const sweep = prog(f, b.shader - 6, b.moves - b.shader - 4, EASE.inOut);
  const ptsOn = prog(f, b.vertices - 8, 16);
  const eye = camAt(f, b).pos;
  const m3 = { ...m, flat: 0 };
  for (let i = 0; i < n; i++) {
    const w = worldOf(T.orig[i * 3], T.orig[i * 3 + 1], T.orig[i * 3 + 2], m);
    pos.setXYZ(i, w[0], w[1], w[2]);
    const nx = T.origN[i * 3];
    const nz = T.origN[i * 3 + 2];
    const wnx = nx * c + nz * s;
    const wny = T.origN[i * 3 + 1];
    const wnz = -nx * s + nz * c;
    nor.setXYZ(i, wnx, wny, wnz);
    // only vertices facing the camera get a visible dot (points ignore depth)
    const w3 = m.flat > 0 ? worldOf(T.orig[i * 3], T.orig[i * 3 + 1], T.orig[i * 3 + 2], m3) : w;
    const vx = eye.x - w3[0];
    const vy = eye.y - w3[1];
    const vz = eye.z - w3[2];
    const facing = (wnx * vx + wny * vy + wnz * vz) / (Math.hypot(vx, vy, vz) || 1);
    const vis = clamp((facing + 0.02) / 0.22);
    // vertex colors: dim until the "vertex shader" sweep reaches them, then flash amber
    let r = 0.55;
    let g = 0.45;
    let bl = 0.25;
    if (sweep > 0) {
      const d = sweep * 1.08 - T.order[i];
      if (d > 0) {
        const flash = Math.max(0, 1 - d / 0.06);
        r = 1;
        g = mix(0.72, 1, flash);
        bl = mix(0.2, 1, flash);
      }
    }
    if (f >= b.moves - 4) {
      r = 1;
      g = 0.72;
      bl = 0.2;
    }
    col.setXYZ(i, r * ptsOn * vis, g * ptsOn * vis, bl * ptsOn * vis);
  }
  pos.needsUpdate = true;
  nor.needsUpdate = true;
  col.needsUpdate = true;
  T.geo.computeBoundingSphere();

  const darken = prog(f, b.triangles - 6, 30, EASE.inOut);
  const wireA = prog(f, b.triangles - 4, 24) * (1 - 0.35 * m.flat);
  const solid = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e9eefc",
        metalness: 0.15,
        roughness: 0.22,
        clearcoat: 1,
        clearcoatRoughness: 0.08,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      }),
    [],
  );
  solid.color.set(new THREE.Color("#e9eefc").lerp(new THREE.Color("#0c1226"), darken * 0.92));
  solid.roughness = mix(0.22, 0.6, darken);
  solid.clearcoat = 1 - darken * 0.8;
  const wire = useMemo(() => new THREE.MeshBasicMaterial({ color: "#5eead4", wireframe: true, transparent: true, depthWrite: false }), []);
  wire.opacity = wireA * 0.85;
  wire.color.set(f >= b.step1 ? "#22d3ee" : "#5eead4");
  const pts = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.075,
        map: glowTex(),
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );
  pts.size = mix(0.075, 0.11, prog(f, b.corners - 10, 20) * (1 - prog(f, b.step1, 20)));
  return (
    <group>
      <mesh geometry={T.geo} material={solid} dispose={null} />
      {wireA > 0.01 && <mesh geometry={T.geo} material={wire} dispose={null} />}
      {ptsOn > 0.01 && <points geometry={T.geo} material={pts} dispose={null} />}
    </group>
  );
};

/** The "screen": a glass plane the teapot is projected onto, plus projection rays. */
const ScreenPlane: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const a = inOut(f, b.projects - 14, 20, b.end - 6, 10);
  const T = tea();
  const m = modelAt(f, b);
  const planeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: "#22d3ee", transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }), []);
  planeMat.opacity = 0.09 * a;
  const edge = useMemo(() => {
    const W = 5.2;
    const H = 3.1;
    const g = new THREE.BufferGeometry();
    const cy = 0.4;
    g.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array([-W / 2, cy - H / 2, 0, W / 2, cy - H / 2, 0, W / 2, cy - H / 2, 0, W / 2, cy + H / 2, 0, W / 2, cy + H / 2, 0, -W / 2, cy + H / 2, 0, -W / 2, cy + H / 2, 0, -W / 2, cy - H / 2, 0]), 3),
    );
    return g;
  }, []);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#8ff3ff", transparent: true }), []);
  edgeMat.opacity = 0.9 * a;
  // rays from a handful of vertices to the eye
  const picks = [0, 300, 700, 1100, 1500, 1900, 2300, 2500];
  const rays = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(picks.length * 6), 3));
    return g;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const rp = rays.getAttribute("position") as THREE.BufferAttribute;
  const unflat = { ...m, flat: 0 };
  picks.forEach((v, k) => {
    const w = worldOf(T.orig[v * 3], T.orig[v * 3 + 1], T.orig[v * 3 + 2], unflat);
    rp.setXYZ(k * 2, w[0], w[1], w[2]);
    rp.setXYZ(k * 2 + 1, EYE.x, EYE.y, EYE.z);
  });
  rp.needsUpdate = true;
  const rayMat = useMemo(() => new THREE.LineBasicMaterial({ color: "#fbbf24", transparent: true, depthWrite: false }), []);
  rayMat.opacity = 0.55 * inOut(f, b.projects - 4, 16, b.nearer + 20, 20);
  if (a <= 0.01) return null;
  return (
    <group>
      <mesh position={[0, 0.4, PLANE_Z]} material={planeMat}>
        <planeGeometry args={[5.2, 3.1]} />
      </mesh>
      <lineSegments geometry={edge} material={edgeMat} position={[0, 0, PLANE_Z]} />
      <lineSegments geometry={rays} material={rayMat} />
      {f < b.flat + 12 && (
        <mesh position={[EYE.x, EYE.y, EYE.z]}>
          <sphereGeometry args={[0.07, 16, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={a * (1 - prog(f, b.flat, 12))} />
        </mesh>
      )}
    </group>
  );
};

// ------------------------------------------------------------------ overlays
const VSHADER: Tok[][] = [
  [["vertex", "k"], [" VertexOut "], ["vertexShader", "f"], ["(Vertex in [[", "p"], ["stage_in", "a"], ["]],"]],
  [["            constant "], ["float4x4", "t"], [" &mvp [[", "p"], ["buffer", "a"], ["(", "p"], ["1", "n"], [")]]) {"]],
  [["  VertexOut out;"]],
  [["  out.position = mvp * "], ["float4", "t"], ["(in.position, "], ["1.0", "n"], [");"]],
  [["  "], ["return", "k"], [" out;"]],
  [["}"]],
];

const Overlays: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const T = tea();
  const cam = makeCam(f, b, width, height);
  const m = modelAt(f, b);
  const triA = inOut(f, b.corners - 6, 14, b.step1 - 4, 12);
  const corners = T.tri.map((v) => toScreen(worldOf(T.orig[v * 3], T.orig[v * 3 + 1], T.orig[v * 3 + 2], m), cam, width, height));
  const titleA = inOut(f, b.famous - 4, 18, b.tri + 10, 14);
  const countA = inOut(f, b.thousands - 6, 14, b.corners - 6, 12);
  const triCount = Math.round(mix(0, T.geo.index!.count / 3, prog(f, b.thousands - 6, 30, EASE.out)));
  const codeA = inOut(f, b.shader - 8, 16, b.moves - 8, 12);
  const processed = Math.round(mix(0, (T.geo.getAttribute("position") as THREE.BufferAttribute).count, clamp(prog(f, b.shader - 6, b.moves - b.shader - 4, EASE.inOut) * 1.08)));
  const ops = [
    { t: "move", at: b.moves },
    { t: "rotate", at: b.rotates },
    { t: "scale", at: b.scales },
    { t: "project", at: b.projects },
  ];
  const opsA = inOut(f, b.moves - 8, 12, b.end - 4, 8);
  const eye = toScreen([EYE.x, EYE.y, EYE.z], cam, width, height);
  const eyeA = inOut(f, b.projects + 10, 14, b.flat + 6, 10);
  return (
    <AbsoluteFill>
      {titleA > 0.01 && (
        <div style={{ position: "absolute", left: 110, top: 140, opacity: titleA }}>
          <Kicker color={C.cyan}>Since 1975</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 70, color: C.ink, marginTop: 12, letterSpacing: "-0.03em" }}>The Utah teapot</div>
          <div style={{ fontFamily: FONT.mono, fontSize: 24, color: C.ink2, marginTop: 8, opacity: prog(f, b.since - 6, 14) }}>Martin Newell · University of Utah</div>
        </div>
      )}
      {countA > 0.01 && (
        <div style={{ position: "absolute", right: 120, top: 150, textAlign: "right", opacity: countA }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 92, color: C.ink, fontVariantNumeric: "tabular-nums", textShadow: `0 0 40px ${hexA(C.teal, 0.6)}` }}>{triCount.toLocaleString("en-US")}</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.4em", color: C.teal }}>TRIANGLES</div>
        </div>
      )}
      {triA > 0.01 && (
        <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: triA }}>
          <path d={`M${corners.map((p) => `${p.x},${p.y}`).join("L")}Z`} fill={hexA(C.cyan, 0.25)} stroke="#c9f7ff" strokeWidth={3} strokeLinejoin="round" />
          {corners.map((p, i) => {
            const la = spr(f, fps, b.vertices - 6 + i * 4, { damping: 18, stiffness: 140 });
            const cxm = (corners[0].x + corners[1].x + corners[2].x) / 3;
            const cym = (corners[0].y + corners[1].y + corners[2].y) / 3;
            const L = Math.hypot(p.x - cxm, p.y - cym) || 1;
            const ux = (p.x - cxm) / L;
            const uy = (p.y - cym) / L;
            const lx = p.x + ux * 120;
            const ly = p.y + uy * 120;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={10} fill={C.amber} />
                <circle cx={p.x} cy={p.y} r={22} fill={C.amber} opacity={0.3} />
                <g opacity={clamp(la * 1.3)}>
                  <line x1={p.x + ux * 16} y1={p.y + uy * 16} x2={p.x + ux * 84} y2={p.y + uy * 84} stroke={C.amber} strokeWidth={2} strokeDasharray="3 5" />
                  <rect x={lx - 72} y={ly - 26} width={144} height={50} rx={12} fill="rgba(5,7,16,0.85)" stroke={hexA(C.amber, 0.6)} />
                  <text x={lx} y={ly + 10} fill={C.ink} fontFamily={FONT.display} fontWeight={700} fontSize={30} textAnchor="middle">
                    vertex
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      )}
      {codeA > 0.01 && (
        <div style={{ position: "absolute", left: 1040, top: 380, opacity: codeA, transform: `translateY(${(1 - codeA) * 30}px)` }}>
          <CodeWindow title="Shaders.metal · runs once per vertex" color={C.amber} width={820}>
            <Code lines={VSHADER} at={b.shader - 4} cps={3.4} size={20} highlight={{ line: 3, a: prog(f, b.every - 6, 12), color: C.amber }} />
          </CodeWindow>
        </div>
      )}
      {codeA > 0.01 && (
        <div style={{ position: "absolute", left: 110, top: 150, opacity: codeA }}>
          <Kicker color={C.amber}>Step 1 · vertex shader</Kicker>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 64, color: C.ink, marginTop: 10, fontVariantNumeric: "tabular-nums" }}>
            {processed.toLocaleString("en-US")}
            <span style={{ fontSize: 26, color: C.amber, marginLeft: 14, letterSpacing: "0.2em" }}>VERTICES DONE</span>
          </div>
        </div>
      )}
      {opsA > 0.01 && (
        <div style={{ position: "absolute", bottom: 90, width: "100%", display: "flex", justifyContent: "center", gap: 18, opacity: opsA }}>
          {ops.map((o, i) => {
            const on = prog(f, o.at - 4, 10);
            return (
              <React.Fragment key={o.t}>
                {i > 0 && <span style={{ fontFamily: FONT.mono, fontSize: 30, color: C.ink3, alignSelf: "center" }}>→</span>}
                <span style={{ padding: "12px 26px", borderRadius: 999, fontFamily: FONT.ui, fontWeight: 700, fontSize: 28, letterSpacing: "0.06em", color: on > 0.5 ? "#05060d" : C.ink3, background: on > 0.5 ? (o.t === "project" ? C.cyan : C.amber) : "rgba(255,255,255,0.05)", border: `1px solid ${hexA(o.t === "project" ? C.cyan : C.amber, 0.3 + 0.7 * on)}`, boxShadow: on > 0.5 ? `0 0 30px ${hexA(o.t === "project" ? C.cyan : C.amber, 0.5)}` : undefined, transform: `scale(${mix(0.92, 1, on)})` }}>
                  {o.t}
                </span>
              </React.Fragment>
            );
          })}
        </div>
      )}
      {eyeA > 0.01 && eye.front && (
        <div style={{ position: "absolute", left: eye.x, top: eye.y - 70, transform: "translateX(-50%)", opacity: eyeA, fontFamily: FONT.ui, fontWeight: 700, fontSize: 24, letterSpacing: "0.2em", color: C.amber, whiteSpace: "nowrap" }}>
          YOUR EYE
        </div>
      )}
      {prog(f, b.flat - 4, 14) > 0.01 && (
        <div style={{ position: "absolute", left: 110, top: 150, opacity: inOut(f, b.flat - 4, 14, b.end - 4, 8) }}>
          <Kicker color={C.cyan}>Projection</Kicker>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 54, color: C.ink, marginTop: 10, letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            3D points → a flat screen
            <br />
            <span style={{ color: C.cyan, opacity: prog(f, b.nearer - 4, 14) }}>nearer = bigger</span>
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const b = beats(s);
  const reveal = prog(f, 10, 50, EASE.out);
  const pinkRim = 1.6 + 0.4 * Math.sin(f / 40);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={14}>
      <AbsoluteFill style={{ background: `radial-gradient(50% 40% at 50% 62%, ${hexA(C.cyan, 0.10)}, transparent 70%)` }} />
      <AbsoluteFill style={{ opacity: reveal }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }} camera={{ fov: 30, position: [4, 3, 9] }}>
          <Env />
          <CamRig b={b} />
          <ambientLight intensity={0.15} />
          <directionalLight position={[4, 8, 6]} intensity={1.6} color="#fff4e8" />
          <directionalLight position={[-7, 3, -5]} intensity={2.2} color="#22d3ee" />
          <directionalLight position={[7, 2, -6]} intensity={pinkRim} color="#f472b6" />
          <TeapotModel b={b} />
          <ScreenPlane b={b} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Overlays b={b} />
    </SceneShell>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 8, name: "swell", vol: 0.3 },
    { at: b.famous - 6, name: "shimmer", vol: 0.3 },
    { at: b.triangles - 6, name: "scan", vol: 0.4 },
    { at: b.thousands - 6, name: "data", vol: 0.3 },
    { at: b.corners - 10, name: "whoosh_soft", vol: 0.3 },
    { at: b.vertices - 6, name: "pop", vol: 0.3 },
    { at: b.vertices - 2, name: "pop", vol: 0.28, rate: 1.1 },
    { at: b.vertices + 2, name: "pop", vol: 0.26, rate: 1.2 },
    { at: b.shader - 6, name: "data_long", vol: 0.35 },
    { at: b.moves - 4, name: "whoosh_soft", vol: 0.3 },
    { at: b.rotates - 4, name: "sweep_up", vol: 0.25 },
    { at: b.scales - 6, name: "bounce", vol: 0.3 },
    { at: b.projects, name: "whoosh", vol: 0.4 },
    { at: b.projects + 20, name: "zap", vol: 0.25 },
    { at: b.nearer - 4, name: "chime", vol: 0.22 },
  ];
};

export const Teapot: SceneModule = {
  Visual,
  sfx,
  backdrop: { hueA: C.cyan, hueB: C.violet, hueC: C.pink, intensity: 0.6 },
};
