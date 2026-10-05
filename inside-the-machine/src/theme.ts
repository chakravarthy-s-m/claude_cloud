// Design tokens — "Obsidian Neon": near-black glass, electric accents.
export const C = {
  void: "#020309",
  bg: "#05060d",
  bg2: "#0a0d1a",
  bg3: "#11152a",
  line: "rgba(160, 175, 255, 0.14)",
  lineHi: "rgba(190, 205, 255, 0.32)",
  ink: "#eef2ff",
  ink2: "#b6c0dc",
  ink3: "#6d7898",
  ink4: "#3d4663",
  cyan: "#22d3ee",
  cyanHi: "#8ff3ff",
  blue: "#60a5fa",
  indigo: "#818cf8",
  violet: "#a78bfa",
  purple: "#c084fc",
  pink: "#f472b6",
  magenta: "#e879f9",
  rose: "#fb7185",
  red: "#f43f5e",
  amber: "#fbbf24",
  orange: "#fb923c",
  lime: "#a3e635",
  green: "#34d399",
  teal: "#2dd4bf",
  gold: "#f5c66b",
} as const;

// One color per abstraction layer, used consistently across the series.
export const LAYER = {
  apps: C.pink,
  frameworks: C.violet,
  services: C.blue,
  kernel: C.cyan,
  hardware: C.green,
  electrons: C.amber,
  alert: C.rose,
} as const;

export const FONT = {
  display: '"Space Grotesk Variable", "Inter Variable", system-ui, sans-serif',
  ui: '"Inter Variable", system-ui, sans-serif',
  mono: '"JetBrains Mono Variable", ui-monospace, monospace',
} as const;

export const W = 1920;
export const H = 1080;
export const FPS = 30;

export const hexA = (hex: string, a: number) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((x) => x + x).join("") : h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};
