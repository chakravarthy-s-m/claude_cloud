import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { C, FONT, hexA } from "../../theme";
import { EASE, clamp, inOut, keyframes, mix, prog, rnd } from "../../lib/anim";
import { cueMap, wordAt, type SceneData, type SfxEvent } from "../../lib/timeline";
import { Glass, Kicker } from "../../components/core";
import { SceneShell } from "../../components/frame";
import type { SceneModule } from "../../components/Episode";

const beats = (s: SceneData) => {
  const c = cueMap(s);
  return {
    c,
    reveal: c.f1.from - 10,
    fin: wordAt(c.f2, "thin fin"),
    source: wordAt(c.f2, "the source"),
    drain: wordAt(c.f2, "the drain"),
    gate: wordAt(c.f2, "Draped over it"),
    oxide: wordAt(c.f2, "insulating layer"),
    off: c.f3.from,
    apply: wordAt(c.f4, "Apply less than a volt"),
    field: wordAt(c.f4, "electric field"),
    channel: wordAt(c.f4, "forming a channel"),
    stream: c.f5.from,
    on: wordAt(c.f5, "The switch is on"),
    atoms: c.f6.from,
    billions: wordAt(c.f6, "twenty-eight billion"),
    stamp: wordAt(c.f6, "postage stamp"),
  };
};
type B = ReturnType<typeof beats>;

// ----- geometry constants (world units ~ 10 nm) -----
const FIN_W = 0.42;
const FIN_H = 1.55;
const FIN_L = 9.2;
const FIN_Z = [-1.25, 0, 1.25];
const OX_TOP = 0.55; // oxide (STI) surface height
const GATE_L = 1.5; // along x
const GATE_H = 2.35;
const GATE_W = 5.0; // along z
const SD_L = 2.6;

const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    (scene as unknown as { environmentIntensity: number }).environmentIntensity = 0.32;
    scene.fog = new THREE.Fog("#05060d", 70, 230);
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 0.85;
  }, [gl, scene]);
  return null;
};

const camAt = (f: number, b: B): { pos: THREE.Vector3; target: THREE.Vector3; fov: number } => {
  const ang = keyframes(f, [[0, -0.95], [b.fin, -0.7], [b.gate, -0.45], [b.off, -0.62], [b.apply, -0.38], [b.stream, -0.55], [b.atoms, -0.2], [b.billions, -0.6]]);
  const elev = keyframes(f, [[0, 0.38], [b.gate, 0.52], [b.off, 0.42], [b.stream, 0.42], [b.atoms, 0.2], [b.billions, 0.9], [b.stamp + 60, 1.25]]);
  const dist = keyframes(f, [[0, 34], [b.reveal + 40, 22], [b.gate, 20], [b.off, 18.5], [b.stream, 19], [b.atoms, 15], [b.billions - 10, 16], [b.billions + 70, 80], [b.stamp + 80, 170]]);
  const target = new THREE.Vector3(keyframes(f, [[0, 0], [b.atoms, 3.2], [b.billions, 0]]), keyframes(f, [[0, 0.8], [b.atoms, 1.0], [b.billions, 0.6]]), 0);
  const pos = new THREE.Vector3(target.x + Math.sin(ang) * Math.cos(elev) * dist, target.y + Math.sin(elev) * dist, target.z + Math.cos(ang) * Math.cos(elev) * dist);
  return { pos, target, fov: 32 };
};

const CamRig: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const { camera } = useThree();
  const { pos, target, fov } = camAt(f, b);
  camera.position.copy(pos);
  (camera as THREE.PerspectiveCamera).fov = fov;
  (camera as THREE.PerspectiveCamera).near = 0.1;
  (camera as THREE.PerspectiveCamera).far = 2000;
  camera.lookAt(target);
  (camera as THREE.PerspectiveCamera).updateProjectionMatrix();
  return null;
};

const glowTexture = (() => {
  let tex: THREE.Texture | null = null;
  return () => {
    if (tex) return tex;
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, "rgba(255,255,255,1)");
    grd.addColorStop(0.2, "rgba(255,214,120,0.95)");
    grd.addColorStop(0.5, "rgba(251,191,36,0.25)");
    grd.addColorStop(1, "rgba(251,191,36,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 64, 64);
    tex = new THREE.CanvasTexture(c);
    return tex;
  };
})();

const NE = 420;

const Electrons: React.FC<{ b: B }> = ({ b }) => {
  const f = useCurrentFrame();
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NE * 3), 3));
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        size: 0.42,
        map: glowTexture(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      }),
    [],
  );
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const gateOn = prog(f, b.apply, 50, EASE.inOut);
  const flowing = prog(f, b.stream - 20, 40, EASE.inOut);
  const visible = prog(f, b.off - 30, 30);
  for (let i = 0; i < NE; i++) {
    const fin = FIN_Z[i % 3];
    const side = rnd(`es${i}`); // 0..1 across fin width
    const hgt = rnd(`eh${i}`); // 0..1 up the fin
    const speed = rnd(`ev${i}`, 0.05, 0.11);
    let x: number;
    let y: number;
    const z = fin + (side - 0.5) * FIN_W * 0.9;
    const baseX = rnd(`ex${i}`, -FIN_L / 2, FIN_L / 2);
    if (flowing > 0.01) {
      // stream source (−x) → drain (+x), looping
      const t = (baseX + FIN_L / 2 + (f - b.stream + 20) * speed * flowing * 2.2) % FIN_L;
      x = -FIN_L / 2 + t;
      // under the gate electrons hug the fin surface (inversion channel)
      const underGate = Math.abs(x) < GATE_L / 2 + 0.3;
      y = OX_TOP + (underGate ? 0.75 + hgt * 0.8 : hgt * (FIN_H - 0.1) + 0.05);
    } else {
      // pooled in source/drain; drawn toward channel surface when the gate turns on
      const inSource = i % 2 === 0;
      x = inSource ? -FIN_L / 2 + rnd(`px${i}`) * SD_L : FIN_L / 2 - rnd(`px${i}`) * SD_L;
      const pulled = gateOn * (rnd(`pp${i}`) < 0.45 ? 1 : 0);
      x = mix(x, (rnd(`cx${i}`) - 0.5) * GATE_L * 0.9, pulled);
      y = OX_TOP + mix(hgt * (FIN_H - 0.2) + 0.1, 0.8 + hgt * 0.75, pulled);
      x += Math.sin(f * 0.2 + i) * 0.03;
    }
    pos.setXYZ(i, x, y, z);
  }
  pos.needsUpdate = true;
  mat.opacity = visible;
  return <points geometry={geo} material={mat} />;
};

const Transistor: React.FC<{ b: B; gateGlow: number; gateAlpha: number; oxGlow: number }> = ({ gateGlow, gateAlpha, oxGlow }) => {
  const si = useMemo(() => new THREE.MeshStandardMaterial({ color: "#1a2132", metalness: 0.35, roughness: 0.5 }), []);
  const finMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#4d6796", metalness: 0.45, roughness: 0.3, emissive: new THREE.Color("#0a1730") }), []);
  const oxide = useMemo(() => new THREE.MeshPhysicalMaterial({ color: "#2b5d8f", metalness: 0, roughness: 0.15, transparent: true, opacity: 0.38, depthWrite: false }), []);
  const gateMat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#252a38", metalness: 0.85, roughness: 0.3, transparent: true }), []);
  const hk = useMemo(() => new THREE.MeshStandardMaterial({ color: "#f59e0b", metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.85, emissive: new THREE.Color("#f59e0b") }), []);
  const spacer = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3d4760", metalness: 0.1, roughness: 0.55 }), []);
  const sdS = useMemo(() => new THREE.MeshStandardMaterial({ color: "#2f63c4", metalness: 0.25, roughness: 0.35, emissive: new THREE.Color("#0b2250") }), []);
  const sdD = useMemo(() => new THREE.MeshStandardMaterial({ color: "#c2416e", metalness: 0.25, roughness: 0.35, emissive: new THREE.Color("#3a0a1c") }), []);
  const metal = useMemo(() => new THREE.MeshStandardMaterial({ color: "#b8894a", metalness: 1, roughness: 0.28 }), []);
  gateMat.opacity = gateAlpha;
  gateMat.emissive = new THREE.Color("#22d3ee").multiplyScalar(gateGlow * 0.55);
  hk.emissiveIntensity = 0.15 + oxGlow * 1.1;
  hk.opacity = 0.35 + oxGlow * 0.6;
  return (
    <group>
      {/* substrate + shallow-trench oxide */}
      <mesh material={si} position={[0, -0.8, 0]}>
        <boxGeometry args={[FIN_L + 1.6, 1.6, GATE_W + 1.4]} />
      </mesh>
      <mesh material={oxide} position={[0, OX_TOP / 2, 0]}>
        <boxGeometry args={[FIN_L + 1.6, OX_TOP, GATE_W + 1.4]} />
      </mesh>
      {/* fins */}
      {FIN_Z.map((z) => (
        <mesh key={z} material={finMat} position={[0, FIN_H / 2, z]}>
          <boxGeometry args={[FIN_L, FIN_H, FIN_W]} />
        </mesh>
      ))}
      {/* high-k gate dielectric wrapping each fin under the gate */}
      {FIN_Z.map((z) => (
        <mesh key={`hk${z}`} material={hk} position={[0, FIN_H / 2 + 0.03, z]}>
          <boxGeometry args={[GATE_L, FIN_H + 0.1, FIN_W + 0.1]} />
        </mesh>
      ))}
      {/* gate (wraps fins on three sides) */}
      <mesh material={gateMat} position={[0, OX_TOP + GATE_H / 2, 0]}>
        <boxGeometry args={[GATE_L, GATE_H, GATE_W]} />
      </mesh>
      {/* spacers */}
      {[-1, 1].map((sd) => (
        <mesh key={sd} material={spacer} position={[sd * (GATE_L / 2 + 0.16), OX_TOP + GATE_H / 2 - 0.05, 0]}>
          <boxGeometry args={[0.3, GATE_H - 0.1, GATE_W]} />
        </mesh>
      ))}
      {/* raised source / drain epitaxy (diamond profile) */}
      {FIN_Z.map((z) =>
        [-1, 1].map((sd) => (
          <mesh key={`sd${z}${sd}`} material={sd < 0 ? sdS : sdD} position={[sd * (FIN_L / 2 - SD_L / 2 - 0.2), FIN_H * 0.62, z]} rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[SD_L, 0.78, 0.78]} />
          </mesh>
        )),
      )}
      {/* contacts */}
      {[-1, 1].map((sd) => (
        <mesh key={`ct${sd}`} material={metal} position={[sd * (FIN_L / 2 - SD_L / 2 - 0.2), FIN_H + 0.55, 0]}>
          <boxGeometry args={[0.9, 0.7, GATE_W - 0.6]} />
        </mesh>
      ))}
      <mesh material={metal} position={[0, OX_TOP + GATE_H + 0.3, 0]}>
        <boxGeometry args={[0.7, 0.6, 1.2]} />
      </mesh>
    </group>
  );
};

/** Pull-back: an endless field of transistors (instanced). */
const Field: React.FC<{ a: number }> = ({ a }) => {
  const N = 34;
  const gateMesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(GATE_L, GATE_H, GATE_W), new THREE.MeshStandardMaterial({ color: "#1f2533", metalness: 0.8, roughness: 0.35, emissive: new THREE.Color("#22d3ee"), emissiveIntensity: 0.35 }), N * N);
    const finM = new THREE.InstancedMesh(new THREE.BoxGeometry(FIN_L, FIN_H, GATE_W), new THREE.MeshStandardMaterial({ color: "#2e4166", metalness: 0.4, roughness: 0.35, emissive: new THREE.Color("#0a1730") }), N * N);
    const d = new THREE.Object3D();
    let k = 0;
    for (let i = 0; i < N; i++)
      for (let j = 0; j < N; j++) {
        const x = (i - N / 2) * 13;
        const z = (j - N / 2) * 8;
        if (Math.abs(i - N / 2) < 0.6 && Math.abs(j - N / 2) < 0.6) {
          d.position.set(9999, 9999, 9999);
        } else d.position.set(x, OX_TOP + GATE_H / 2, z);
        d.updateMatrix();
        m.setMatrixAt(k, d.matrix);
        d.position.set(x === 9999 ? 9999 : (i - N / 2) * 13, FIN_H / 2, (j - N / 2) * 8);
        if (Math.abs(i - N / 2) < 0.6 && Math.abs(j - N / 2) < 0.6) d.position.set(9999, 9999, 9999);
        d.updateMatrix();
        finM.setMatrixAt(k, d.matrix);
        k++;
      }
    m.instanceMatrix.needsUpdate = true;
    finM.instanceMatrix.needsUpdate = true;
    return { m, finM };
  }, []);
  gateMesh.m.visible = a > 0.01;
  gateMesh.finM.visible = a > 0.01;
  return (
    <group>
      <primitive object={gateMesh.finM} />
      <primitive object={gateMesh.m} />
    </group>
  );
};

const Labels: React.FC<{ b: B; width: number; height: number }> = ({ b, width, height }) => {
  const f = useCurrentFrame();
  const cam = useMemo(() => new THREE.PerspectiveCamera(32, width / height, 0.1, 2000), [width, height]);
  const { pos, target } = camAt(f, b);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  const P = (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return { x: (v.x * 0.5 + 0.5) * width, y: (-v.y * 0.5 + 0.5) * height };
  };
  const out = 1 - prog(f, b.atoms - 10, 14);
  const items = [
    { at: b.fin, p: P(-1.6, FIN_H + 0.1, FIN_Z[2]), t: "Fin", s: "silicon · a few nm wide", col: "#a5b4fc", dx: -40, dy: -170 },
    { at: b.source, p: P(-(FIN_L / 2 - SD_L / 2), FIN_H + 0.9, FIN_Z[0] - 0.5), t: "Source", s: "electrons enter", col: "#7aa7ff", dx: -120, dy: -120 },
    { at: b.drain, p: P(FIN_L / 2 - SD_L / 2, FIN_H + 0.9, FIN_Z[0] - 0.5), t: "Drain", s: "electrons exit", col: "#ff8fb0", dx: 130, dy: -110 },
    { at: b.gate, p: P(0, OX_TOP + GATE_H + 0.6, 0), t: "Gate", s: "metal, wraps 3 sides", col: C.cyan, dx: 0, dy: -150 },
    { at: b.oxide, p: P(0, FIN_H * 0.6, FIN_Z[2] + FIN_W / 2 + 0.05), t: "Gate insulator", s: "high-k · only atoms thick", col: C.amber, dx: 170, dy: 120 },
  ];
  return (
    <AbsoluteFill style={{ opacity: out }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        {items.map((it) => {
          const a = prog(f, it.at - 4, 14);
          return a > 0.01 ? (
            <g key={it.t} opacity={a}>
              <line x1={it.p.x} y1={it.p.y} x2={it.p.x + it.dx} y2={it.p.y + it.dy + 30} stroke={it.col} strokeWidth={1.6} strokeDasharray="3 5" />
              <circle cx={it.p.x} cy={it.p.y} r={6} fill={it.col} />
            </g>
          ) : null;
        })}
      </svg>
      {items.map((it) => {
        const a = prog(f, it.at - 4, 14);
        return a > 0.01 ? (
          <div key={it.t} style={{ position: "absolute", left: it.p.x + it.dx, top: it.p.y + it.dy, transform: "translate(-50%, -100%)", opacity: a, padding: "8px 16px", borderRadius: 12, background: "rgba(6,9,20,0.82)", border: `1px solid ${hexA(it.col, 0.6)}`, whiteSpace: "nowrap", textAlign: "center" }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 28, color: C.ink }}>{it.t}</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 16, color: it.col }}>{it.s}</div>
          </div>
        ) : null;
      })}
    </AbsoluteFill>
  );
};

const Visual: React.FC<{ s: SceneData }> = ({ s }) => {
  const f = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const b = beats(s);
  const reveal = prog(f, 0, 40, EASE.out);
  const gateGlow = prog(f, b.apply, 40, EASE.inOut);
  const gateAlpha = mix(1, 0.22, prog(f, b.oxide - 10, 30, EASE.inOut));
  const oxGlow = inOut(f, b.oxide - 6, 16, b.off, 20) + gateGlow * 0.4;
  const fieldA = prog(f, b.billions - 20, 30);
  const atomA = inOut(f, b.atoms - 4, 16, b.billions - 12, 14);
  const vg = mix(0, 0.7, gateGlow);
  const state = f < b.apply ? "OFF" : f < b.stream ? "turning on…" : "ON";
  const hudA = inOut(f, b.off - 10, 16, b.atoms - 10, 12);
  const stampA = prog(f, b.stamp - 6, 20);
  return (
    <SceneShell dur={s.durationInFrames} enter={0} exit={16}>
      <AbsoluteFill style={{ background: "radial-gradient(90% 80% at 50% 45%, #0e1630 0%, #05060d 60%, #020309 100%)" }} />
      <AbsoluteFill style={{ opacity: reveal }}>
        <ThreeCanvas width={width} height={height} gl={{ antialias: true }} camera={{ fov: 32, position: [10, 6, 16] }}>
          <Env />
          <CamRig b={b} />
          <ambientLight intensity={0.12} />
          <directionalLight position={[6, 10, 8]} intensity={1.6} />
          <directionalLight position={[-8, 4, -6]} intensity={1.6} color="#8b5cf6" />
          <directionalLight position={[2, 3, -10]} intensity={1.2} color="#22d3ee" />
          <pointLight position={[0, 4, 0]} intensity={gateGlow * 40} distance={12} color="#22d3ee" />
          <Transistor b={b} gateGlow={gateGlow} gateAlpha={gateAlpha} oxGlow={oxGlow} />
          <Electrons b={b} />
          <Field a={fieldA} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Labels b={b} width={width} height={height} />
      {/* title */}
      <div style={{ position: "absolute", left: 110, top: 120, opacity: inOut(f, 20, 20, b.fin - 10, 14) }}>
        <Kicker color={C.orange}>FinFET transistor · 3 nm class</Kicker>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 60, color: C.ink, marginTop: 10, letterSpacing: "-0.03em" }}>One switch, up close</div>
      </div>
      {/* gate voltage HUD */}
      {hudA > 0.01 && (
        <div style={{ position: "absolute", right: 110, top: 140, opacity: hudA }}>
          <Glass color={state === "ON" ? C.green : state === "OFF" ? C.ink3 : C.cyan} style={{ width: 360, padding: "20px 26px" }} glow={state === "ON" ? 0.9 : 0.3}>
            <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 17, letterSpacing: "0.25em", color: C.ink3 }}>GATE VOLTAGE</div>
            <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 60, color: C.ink }}>{vg.toFixed(2)} V</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 34, color: state === "ON" ? C.green : state === "OFF" ? C.ink3 : C.cyan }}>{state === "ON" ? "ON · current flows" : state === "OFF" ? "OFF · no channel" : "channel forming…"}</div>
          </Glass>
        </div>
      )}
      {/* atomic scale inset */}
      {atomA > 0.01 && <AtomInset a={atomA} />}
      {/* final numbers */}
      {fieldA > 0.01 && <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(2,3,9,0.85) 0%, rgba(2,3,9,0.0) 40%)", opacity: fieldA }} />}
      {fieldA > 0.01 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 110, textAlign: "center", opacity: fieldA }}>
          <div style={{ fontFamily: FONT.mono, fontWeight: 700, fontSize: 96, color: C.ink, textShadow: `0 0 50px ${hexA(C.cyan, 0.6)}` }}>× 28,000,000,000</div>
          <div style={{ fontFamily: FONT.ui, fontWeight: 600, fontSize: 24, letterSpacing: "0.4em", color: C.cyan }}>SWITCHES ON ONE CHIP</div>
        </div>
      )}
      {stampA > 0.01 && <Stamp a={stampA} />}
    </SceneShell>
  );
};

const AtomInset: React.FC<{ a: number }> = ({ a }) => {
  const f = useCurrentFrame();
  const cols = 22;
  const rows = 40;
  const s = 15;
  const W = cols * s;
  const H = rows * s;
  const x0 = 1280;
  const y0 = 200;
  return (
    <div style={{ position: "absolute", left: x0 - 40, top: y0 - 70, opacity: a, transform: `scale(${mix(0.92, 1, a)})` }}>
      <Glass color={C.orange} style={{ width: W + 200, height: H + 150, padding: 24 }} glow={0.6}>
        <div style={{ fontFamily: FONT.ui, fontWeight: 700, fontSize: 17, letterSpacing: "0.25em", color: C.orange }}>FIN CROSS-SECTION · ATOMS</div>
        <svg width={W + 160} height={H + 80} style={{ marginTop: 12 }}>
          <defs>
            <clipPath id="finclip">
              <path d={`M20,${H + 10} L20,40 Q20,10 ${W / 2 + 20},10 Q${W + 20},10 ${W + 20},40 L${W + 20},${H + 10} Z`} />
            </clipPath>
          </defs>
          <path d={`M20,${H + 10} L20,40 Q20,10 ${W / 2 + 20},10 Q${W + 20},10 ${W + 20},40 L${W + 20},${H + 10} Z`} fill={hexA("#8fa3c7", 0.12)} stroke="#8fa3c7" strokeWidth={2} />
          <g clipPath="url(#finclip)">
            {new Array(rows + 2).fill(0).map((_, r) =>
              new Array(cols + 1).fill(0).map((__, c) => {
                const x = 20 + c * s + (r % 2 ? s / 2 : 0);
                const y = 14 + r * s * 0.9;
                const tw = 0.6 + 0.4 * Math.sin(f * 0.15 + r * 0.7 + c);
                return <circle key={`${r}-${c}`} cx={x} cy={y} r={4.2} fill={`rgba(165,180,252,${0.55 + 0.35 * tw})`} />;
              }),
            )}
          </g>
          <line x1={20} y1={H + 40} x2={W + 20} y2={H + 40} stroke={C.orange} strokeWidth={2} />
          <line x1={20} y1={H + 30} x2={20} y2={H + 50} stroke={C.orange} strokeWidth={2} />
          <line x1={W + 20} y1={H + 30} x2={W + 20} y2={H + 50} stroke={C.orange} strokeWidth={2} />
          <text x={W / 2 + 20} y={H + 74} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.ink}>
            a few dozen atoms across
          </text>
        </svg>
      </Glass>
    </div>
  );
};

const Stamp: React.FC<{ a: number }> = ({ a }) => {
  const W = 300;
  const H = 360;
  const x0 = 1440;
  const y0 = 560;
  const perf = [];
  for (let i = 0; i <= 14; i++) perf.push(<circle key={`t${i}`} cx={(i / 14) * W} cy={0} r={8} fill="#05060d" />, <circle key={`b${i}`} cx={(i / 14) * W} cy={H} r={8} fill="#05060d" />);
  for (let i = 0; i <= 17; i++) perf.push(<circle key={`l${i}`} cx={0} cy={(i / 17) * H} r={8} fill="#05060d" />, <circle key={`r${i}`} cx={W} cy={(i / 17) * H} r={8} fill="#05060d" />);
  return (
    <div style={{ position: "absolute", left: x0, top: y0, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>
      <svg width={W + 20} height={H + 80} style={{ overflow: "visible" }}>
        <rect width={W} height={H} fill="rgba(240,230,210,0.12)" stroke="rgba(240,230,210,0.6)" strokeWidth={2} />
        {perf}
        <rect x={W / 2 - 75} y={H / 2 - 75} width={150} height={150} rx={6} fill="#141a28" stroke={C.cyan} strokeWidth={2} />
        <rect x={W / 2 - 75} y={H / 2 - 75} width={150} height={150} rx={6} fill={hexA(C.cyan, 0.15)} />
        <text x={W / 2} y={H / 2 + 8} textAnchor="middle" fontFamily={FONT.mono} fontSize={18} fill={C.cyan}>
          the chip
        </text>
        <text x={W / 2} y={H + 50} textAnchor="middle" fontFamily={FONT.mono} fontSize={20} fill={C.ink2}>
          vs. a postage stamp
        </text>
      </svg>
    </div>
  );
};

const sfx = (s: SceneData): SfxEvent[] => {
  const b = beats(s);
  return [
    { at: 0, name: "whoosh_big", vol: 0.45 },
    { at: 6, name: "swell", vol: 0.3 },
    { at: b.fin - 4, name: "pop", vol: 0.3 },
    { at: b.source - 4, name: "blip", vol: 0.25 },
    { at: b.drain - 4, name: "blip", vol: 0.25 },
    { at: b.gate - 4, name: "pop_hi", vol: 0.3 },
    { at: b.oxide - 6, name: "shimmer", vol: 0.25 },
    { at: b.off, name: "power_down", vol: 0.2 },
    { at: b.apply, name: "power_up", vol: 0.4 },
    { at: b.field - 4, name: "hum", vol: 0.3 },
    { at: b.channel - 6, name: "zap", vol: 0.3 },
    { at: b.stream - 20, name: "electrons", vol: 0.55 },
    { at: b.stream + 40, name: "electrons", vol: 0.45 },
    { at: b.on - 4, name: "chime_lo", vol: 0.3 },
    { at: b.atoms - 6, name: "whoosh_soft", vol: 0.35 },
    { at: b.billions - 20, name: "whoosh_big", vol: 0.45 },
    { at: b.billions - 10, name: "riser", vol: 0.3 },
    { at: b.billions + 50, name: "impact", vol: 0.35 },
    { at: b.stamp - 6, name: "pop", vol: 0.3 },
  ];
};

export const FinFet: SceneModule = {
  Visual,
  sfx,
  opaque: true,
  backdrop: { hueA: C.orange, hueB: C.cyan, hueC: C.violet, intensity: 0.3 },
};
