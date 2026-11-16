#!/usr/bin/env node
/**
 * Builds every SVG in assets/ for the profile README, each in a dark and a light variant.
 *
 *   node scripts/build.mjs             banner, buttons, section titles, cards, Datalab, languages, stats
 *   node scripts/build.mjs --private   also refresh data/languages.json and data/datalab.json
 *                                      (needs a token that sees private repos, so run it locally)
 *
 * Contribution stats and star counts need GITHUB_TOKEN (or GH_TOKEN). Without one they are skipped
 * and the committed files stay as they are. No dependencies, Node 20+.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASSETS = join(ROOT, "assets");
const LANG_FILE = join(ROOT, "data", "languages.json");
const DATALAB_FILE = join(ROOT, "data", "datalab.json");
const LOGIN = "ArmandSwirc";
const DATALAB_ORG = "HR-Business-Datalab";
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "";
const REFRESH_PRIVATE = process.argv.includes("--private");

const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const MONO = "ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";

const THEMES = {
  dark: {
    bg1: "#0f1426", bg2: "#161033", border: "#2b2654", title: "#f5f3ff", text: "#b9b6d6",
    muted: "#8582a8", accent: "#a78bfa", accent2: "#22d3ee", track: "#1e1a3d", ocean: "#1e3a8a",
  },
  light: {
    bg1: "#ffffff", bg2: "#f6f3ff", border: "#e3dcf8", title: "#1e1b4b", text: "#46435f",
    muted: "#6e6a8a", accent: "#7c3aed", accent2: "#0e7490", track: "#ede9fb", ocean: "#3b82f6",
  },
};

// ---------------------------------------------------------------------------------------- helpers

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const r1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => n.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function wrap(text, max) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    if (line && (line + " " + word).length > max) { lines.push(line); line = word; }
    else line = line ? line + " " + word : word;
  }
  if (line) lines.push(line);
  return lines;
}

function svg(w, h, label, body, css = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}">
<title>${esc(label)}</title>
<style>
${css}
@media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
</style>
${body}
</svg>
`;
}

function write(name, content) {
  writeFileSync(join(ASSETS, name), content);
  console.log(`  ✓ assets/${name}`);
}

/** SMIL values/keyTimes for a discrete animation from [seconds, value] frames over a cycle of T seconds. */
function smil(frames, T, map) {
  return {
    values: frames.map(([, v]) => map(v)).join(";"),
    keyTimes: frames.map(([s]) => (s / T).toFixed(5)).join(";"),
  };
}

// ----------------------------------------------------------------------------------------- banner

function typingLine({ x, y, size, prompt, phrases, color, promptColor }) {
  const cw = size * 0.6; // every phrase is forced to this advance with textLength, so the cursor lines up
  const TYPE = 0.07, HOLD = 1.9, ERASE = 0.028, GAP = 0.45;
  const spans = [];
  let t = 0.3;
  for (const p of phrases) {
    const t0 = t;
    const tErase = t0 + p.length * TYPE + HOLD;
    spans.push({ p, n: p.length, t0, tErase });
    t = tErase + p.length * ERASE + GAP;
  }
  const T = t;
  const x0 = x + cw * (prompt.length + 1);
  const cursorFrames = [[0, 0]];
  let out = `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${size}" font-weight="700" fill="${promptColor}">${esc(prompt)}</text>`;
  spans.forEach((s, i) => {
    const frames = [[0, 0]];
    for (let k = 1; k <= s.n; k++) frames.push([s.t0 + k * TYPE, k]);
    for (let k = 1; k <= s.n; k++) frames.push([s.tErase + k * ERASE, s.n - k]);
    cursorFrames.push(...frames.slice(1));
    const a = smil(frames, T, (v) => r1(v * cw));
    out += `
<clipPath id="tp${i}"><rect x="${r1(x0)}" y="${r1(y - size)}" height="${r1(size * 1.45)}" width="0"><animate attributeName="width" dur="${T.toFixed(3)}s" repeatCount="indefinite" calcMode="discrete" values="${a.values}" keyTimes="${a.keyTimes}"/></rect></clipPath>
<text x="${r1(x0)}" y="${y}" font-family="${MONO}" font-size="${size}" fill="${color}" textLength="${r1(s.n * cw)}" lengthAdjust="spacingAndGlyphs" clip-path="url(#tp${i})">${esc(s.p)}</text>`;
  });
  const c = smil(cursorFrames, T, (v) => r1(x0 + v * cw + 1.5));
  out += `
<rect x="${r1(x0 + 1.5)}" y="${r1(y - size * 0.8)}" width="${r1(size * 0.5)}" height="${r1(size * 0.98)}" rx="1.5" fill="${promptColor}" opacity="0.85"><animate attributeName="x" dur="${T.toFixed(3)}s" repeatCount="indefinite" calcMode="discrete" values="${c.values}" keyTimes="${c.keyTimes}"/><animate attributeName="opacity" values="0.9;0.1" dur="1.05s" repeatCount="indefinite" calcMode="discrete"/></rect>`;
  return out;
}

function banner(mode) {
  const night = mode === "dark";
  const W = 1200, H = 360, GROUND = 318;
  const rand = rng(1979);
  const c = night
    ? {
        sky: [[0, "#050816"], [0.5, "#120f33"], [0.8, "#2c1a5c"], [1, "#5a2377"]],
        building: "#080919", lit: "#fcd34d", water1: "#1b1545", water2: "#05061a", shimmer: "#a78bfa",
        name1: "#ffffff", name2: "#c4b5fd", text: "#cdcaea", muted: "#9a96c2", day: "#fbbf24", night: "#b69cff",
        prompt: "#22d3ee", typed: "#ecebff", dot: "#34d399", cable: "#c4b5fd", frame: "#2b2654",
      }
    : {
        sky: [[0, "#8ccaff"], [0.5, "#cfe8ff"], [0.82, "#ffeccf"], [1, "#ffd3a1"]],
        building: "#1f2a44", lit: "#dbeafe", water1: "#60b5f0", water2: "#2a74bd", shimmer: "#ffffff",
        name1: "#0f172a", name2: "#5b21b6", text: "#334155", muted: "#475569", day: "#c2410c", night: "#6d28d9",
        prompt: "#0e7490", typed: "#0f172a", dot: "#059669", cable: "#1f2a44", frame: "#cbd5e1",
      };

  const css = `
.st { fill: #fff; animation: tw 3s ease-in-out infinite; }
@keyframes tw { 0%, 100% { opacity: .2 } 50% { opacity: 1 } }
.shoot { opacity: 0; animation: shoot 11s ease-in 2s infinite; }
@keyframes shoot { 0% { transform: translate(560px, 6px); opacity: 0 } 2% { opacity: 1 } 9% { transform: translate(800px, 86px); opacity: 0 } 100% { transform: translate(800px, 86px); opacity: 0 } }
.glow { animation: glow 6s ease-in-out infinite; transform-origin: 930px 80px; }
@keyframes glow { 0%, 100% { opacity: .65; transform: scale(1) } 50% { opacity: 1; transform: scale(1.1) } }
.rays { animation: spin 50s linear infinite; transform-origin: 930px 80px; }
@keyframes spin { to { transform: rotate(360deg) } }
.cloud { animation: drift 90s linear infinite; }
@keyframes drift { from { transform: translateX(-260px) } to { transform: translateX(1460px) } }
.w { animation: flick 9s steps(1) infinite; }
@keyframes flick { 0%, 100% { opacity: .9 } 45% { opacity: .15 } 70% { opacity: .9 } }
.sh { animation: sh 5s ease-in-out infinite; }
@keyframes sh { 0%, 100% { transform: translateX(0); opacity: .15 } 50% { transform: translateX(14px); opacity: .55 } }
.beacon { animation: beacon 1.6s steps(1) infinite; }
@keyframes beacon { 0%, 100% { opacity: 1 } 50% { opacity: .15 } }
.ping { animation: ping 2.4s ease-out infinite; transform-origin: 71px 81px; }
@keyframes ping { 0% { transform: scale(1); opacity: .7 } 100% { transform: scale(3.2); opacity: 0 } }
.markt { animation: markt 7s ease-in-out infinite; }
@keyframes markt { 0%, 100% { opacity: .75 } 50% { opacity: 1 } }`;

  // sky, stars, sun or moon, clouds
  let back = "";
  if (night) {
    for (let i = 0; i < 90; i++) {
      const x = rand() * W, y = 6 + rand() * 250, r = r1(0.5 + rand() * 1.3);
      const inText = x < 640 && y > 60 && y < 250;
      if (inText && rand() < 0.8) continue;
      back += `<circle class="st" cx="${r1(x)}" cy="${r1(y)}" r="${r}" style="animation-delay:-${r1(rand() * 5)}s;animation-duration:${r1(2.4 + rand() * 3.5)}s"/>`;
    }
    back += `
<g class="shoot"><line x1="0" y1="0" x2="96" y2="32" stroke="url(#shootGrad)" stroke-width="2" stroke-linecap="round"/></g>
<circle class="glow" cx="930" cy="80" r="100" fill="url(#moonGlow)"/>
<circle cx="930" cy="80" r="27" fill="#fdf6d8" mask="url(#crescent)"/>`;
  } else {
    let rays = "";
    for (let i = 0; i < 12; i++) {
      const a = (i * Math.PI) / 6;
      rays += `<line x1="${r1(930 + Math.cos(a) * 42)}" y1="${r1(80 + Math.sin(a) * 42)}" x2="${r1(930 + Math.cos(a) * 56)}" y2="${r1(80 + Math.sin(a) * 56)}"/>`;
    }
    const cloud = (x, y, s) =>
      `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="46" ry="16"/><ellipse cx="-18" cy="-10" rx="22" ry="17"/><ellipse cx="14" cy="-14" rx="26" ry="21"/></g>`;
    back += `
<circle class="glow" cx="930" cy="80" r="120" fill="url(#sunGlow)"/>
<g class="rays" stroke="#f59e0b" stroke-width="3.5" stroke-linecap="round" opacity="0.8">${rays}</g>
<circle cx="930" cy="80" r="31" fill="url(#sun)"/>
<g fill="#ffffff" opacity="0.88">
  <g class="cloud" style="animation-delay:-20s">${cloud(0, 46, 1)}</g>
  <g class="cloud" style="animation-delay:-58s;animation-duration:120s">${cloud(0, 118, 0.75)}</g>
  <g class="cloud" style="animation-delay:-84s;animation-duration:105s">${cloud(0, 30, 0.6)}</g>
</g>`;
  }

  // skyline (west to east: blocks, Markthal, cube houses, Het Potlood, Erasmusbrug, De Rotterdam, Euromast)
  let shapes = "";
  let windows = "";
  const win = (x, y) => {
    if (rand() > (night ? 0.34 : 0.22)) return;
    const flick = night && rand() < 0.3;
    windows += `<rect${flick ? ` class="w" style="animation-delay:-${r1(rand() * 9)}s"` : ""} x="${r1(x)}" y="${r1(y)}" width="3" height="4" opacity="${night ? 0.9 : 0.45}"/>`;
  };
  const block = (x, top, w) => {
    shapes += `<rect x="${x}" y="${top}" width="${w}" height="${GROUND - top + 1}"/>`;
    for (let wy = top + 7; wy < GROUND - 6; wy += 9) for (let wx = x + 5; wx < x + w - 5; wx += 7) win(wx, wy);
  };
  for (let x = 0; x < 424; ) {
    const w = 22 + Math.floor(rand() * 26);
    const top = GROUND - (20 + Math.floor(rand() * 46));
    block(x, top, Math.min(w, 424 - x));
    if (rand() < 0.25) shapes += `<rect x="${x + Math.floor(w / 2)}" y="${top - 12}" width="2" height="12"/>`;
    x += w;
  }
  // Markthal: the horseshoe with its glowing mural
  shapes += `<path d="M428 ${GROUND + 1} V272 Q474 220 520 272 V${GROUND + 1} Z"/>`;
  const markthalInner = `<path class="markt" d="M446 ${GROUND} V280 Q474 246 502 280 V${GROUND} Z" fill="url(#mural)"/>`;
  block(520, 290, 20);
  // Kubuswoningen: tilted cubes on poles
  for (const cx of [556, 580, 604, 628]) {
    shapes += `<rect x="${cx - 3}" y="292" width="6" height="${GROUND - 291}"/><polygon points="${cx},266 ${cx + 13},279 ${cx},292 ${cx - 13},279"/>`;
    win(cx - 1.5, 277);
  }
  // Het Potlood
  shapes += `<rect x="645" y="234" width="15" height="${GROUND - 233}"/><polygon points="645,234 652.5,204 660,234"/>`;
  for (let wy = 242; wy < GROUND - 6; wy += 9) win(651, wy);
  // Erasmusbrug: deck, kinked pylon and cables
  let cables = "";
  for (let i = 0; i < 5; i++) cables += `<line x1="784" y1="${158 + i * 13}" x2="${682 + i * 19}" y2="301"/>`;
  for (let i = 0; i < 4; i++) cables += `<line x1="785" y1="${160 + i * 13}" x2="${872 - i * 17}" y2="301"/>`;
  const bridge = `
<g stroke="${c.cable}" stroke-width="1.2" opacity="${night ? 0.7 : 0.85}">${cables}</g>
<rect x="664" y="300" width="242" height="5" rx="2"/>
<polygon points="766,${GROUND + 1} 777,301 780,150 788,150 791,301 802,${GROUND + 1} 794,${GROUND + 1} 784,307 774,${GROUND + 1}"/>`;
  // De Rotterdam: three towers with shifted upper halves
  for (const [x, w, lowTop, upX, upTop] of [[905, 26, 226, 909, 160], [933, 28, 210, 929, 136], [963, 26, 222, 967, 168]]) {
    block(x, lowTop, w);
    block(upX, upTop, w);
  }
  // fillers around the Euromast
  for (const [x, w, top] of [[1000, 24, 238], [1024, 20, 262], [1044, 24, 226], [1100, 30, 276], [1130, 26, 258], [1156, 44, 284]]) block(x, top, w);
  // Euromast with its beacon
  const euromast = `
<rect x="1074" y="116" width="12" height="${GROUND - 115}"/>
<rect x="1058" y="174" width="44" height="12" rx="4"/>
<ellipse cx="1080" cy="174" rx="25" ry="5"/>
<rect x="1077" y="64" width="6" height="54"/>
<rect x="1079" y="42" width="2" height="24"/>`;
  const beacon = `<circle class="beacon" cx="1080" cy="41" r="3" fill="#ef4444"/>`;

  // water: the Maas
  let shimmer = "";
  for (let i = 0; i < 22; i++) {
    const x = rand() * W, y = GROUND + 6 + rand() * 32, len = 18 + rand() * 50;
    shimmer += `<line class="sh" x1="${r1(x)}" y1="${r1(y)}" x2="${r1(x + len)}" y2="${r1(y)}" style="animation-delay:-${r1(rand() * 5)}s"/>`;
  }
  let glint = "";
  for (let i = 0; i < 5; i++) {
    const w = 46 - i * 8;
    glint += `<line class="sh" x1="${930 - w / 2}" y1="${GROUND + 8 + i * 7}" x2="${930 + w / 2}" y2="${GROUND + 8 + i * 7}" style="animation-delay:-${i * 0.7}s"/>`;
  }

  const body = `
<defs>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="22"/></clipPath>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="${GROUND}" gradientUnits="userSpaceOnUse">${c.sky.map(([o, col]) => `<stop offset="${o}" stop-color="${col}"/>`).join("")}</linearGradient>
  <linearGradient id="water" x1="0" y1="${GROUND}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.water1}"/><stop offset="1" stop-color="${c.water2}"/></linearGradient>
  <linearGradient id="name" x1="60" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${c.name1}"/><stop offset="0.55" stop-color="${c.name1}"/><stop offset="1" stop-color="${c.name2}"/></linearGradient>
  <linearGradient id="mural" x1="0" y1="246" x2="0" y2="${GROUND}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${night ? "#f472b6" : "#93c5fd"}"/><stop offset="1" stop-color="${night ? "#f59e0b" : "#e0f2fe"}"/></linearGradient>
  <linearGradient id="shootGrad" x1="0" y1="0" x2="96" y2="32" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <radialGradient id="moonGlow"><stop offset="0" stop-color="#c4b5fd" stop-opacity="0.5"/><stop offset="1" stop-color="#c4b5fd" stop-opacity="0"/></radialGradient>
  <radialGradient id="sunGlow"><stop offset="0" stop-color="#fde68a" stop-opacity="0.9"/><stop offset="1" stop-color="#fde68a" stop-opacity="0"/></radialGradient>
  <radialGradient id="sun" cx="0.4" cy="0.35"><stop offset="0" stop-color="#fff7cc"/><stop offset="0.6" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></radialGradient>
  <mask id="crescent"><rect width="${W}" height="${H}" fill="#fff"/><circle cx="942" cy="71" r="24" fill="#000"/></mask>
</defs>
<g clip-path="url(#frame)">
  <rect width="${W}" height="${H}" fill="url(#sky)"/>
  ${back}
  <g fill="${c.building}">${shapes}${bridge}${euromast}</g>
  ${markthalInner}
  <g fill="${c.lit}">${windows}</g>
  ${beacon}
  <rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="url(#water)"/>
  <g stroke="${c.shimmer}" stroke-width="1.5" stroke-linecap="round">${shimmer}${night ? glint : ""}</g>

  <circle class="ping" cx="71" cy="81" r="5" fill="${c.dot}"/>
  <circle cx="71" cy="81" r="5" fill="${c.dot}"/>
  <text x="86" y="87" font-family="${MONO}" font-size="15" font-weight="600" letter-spacing="3" fill="${c.muted}">ROTTERDAM, NL</text>
  <text x="60" y="150" font-family="${SANS}" font-size="70" font-weight="800" letter-spacing="-1.5" fill="url(#name)">Armand Swirc</text>
  <text x="63" y="192" font-family="${SANS}" font-size="24" font-weight="500" fill="${c.text}">Marketing student <tspan fill="${c.day}" font-weight="700">by day</tspan> · AI developer <tspan fill="${c.night}" font-weight="700">by night</tspan></text>
  ${typingLine({
    x: 63, y: 236, size: 19, prompt: "$", color: c.typed, promptColor: c.prompt,
    phrases: [
      "building AI platforms for education",
      "simulating the whole Earth in pixels",
      "benchmarking LLMs at Battleship",
      "wiring Claude into everything (MCP)",
      "shipping real products, no mockups",
    ],
  })}
</g>
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="21.5" fill="none" stroke="${c.frame}" stroke-width="1.5"/>`;

  return svg(W, H, "Armand Swirc: Marketing student by day, AI developer by night. Rotterdam, NL.", body, css);
}

// ---------------------------------------------------------------------------------------- buttons

const ICONS = {
  globe: (col) => `<g fill="none" stroke="${col}" stroke-width="1.8"><circle cx="0" cy="0" r="8"/><ellipse cx="0" cy="0" rx="3.6" ry="8"/><line x1="-8" y1="0" x2="8" y2="0"/></g>`,
  linkedin: (col) => `<rect x="-8" y="-8" width="16" height="16" rx="3" fill="${col}"/><text x="0" y="4.6" text-anchor="middle" font-family="${SANS}" font-size="11" font-weight="800" fill="#ffffff">in</text>`,
  lab: (col) => `<g fill="none" stroke="${col}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"><path d="M-3 -8 H3 M-2 -8 V-2 L-7 7 H7 L2 -2 V-8"/><line x1="-4.6" y1="2.5" x2="4.6" y2="2.5"/></g>`,
};

function button(mode, label, icon, iconColor) {
  const t = THEMES[mode];
  const W = Math.round(52 + label.length * 8.6), H = 40;
  const body = `
<rect x="0.75" y="0.75" width="${W - 1.5}" height="${H - 1.5}" rx="20" fill="${t.bg1}" stroke="${t.border}" stroke-width="1.5"/>
<g transform="translate(24 20)">${ICONS[icon](iconColor ?? t.accent)}</g>
<text x="42" y="25.5" font-family="${SANS}" font-size="14.5" font-weight="600" fill="${t.title}">${esc(label)}</text>`;
  return svg(W, H, label, body);
}

// ----------------------------------------------------------------------------------- section titles

function sectionTitle(mode, index, title) {
  const t = THEMES[mode];
  const W = 1000, H = 56;
  const lineX = Math.round(48 + title.length * 15.6 + 18);
  const css = `
.glint { animation: glint 5s cubic-bezier(.5,0,.5,1) infinite; }
@keyframes glint { 0% { transform: translateX(${lineX - 80}px); opacity: 0 } 10% { opacity: 1 } 60% { transform: translateX(${W}px); opacity: 0 } 100% { transform: translateX(${W}px); opacity: 0 } }`;
  const body = `
<defs>
  <linearGradient id="line" x1="${lineX}" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent}"/><stop offset="0.6" stop-color="${t.accent2}" stop-opacity="0.35"/><stop offset="1" stop-color="${t.accent2}" stop-opacity="0"/></linearGradient>
  <linearGradient id="g" x1="0" y1="0" x2="80" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent2}" stop-opacity="0"/><stop offset="0.5" stop-color="${t.accent2}"/><stop offset="1" stop-color="${t.accent2}" stop-opacity="0"/></linearGradient>
</defs>
<text x="2" y="37" font-family="${MONO}" font-size="15" font-weight="700" fill="${t.accent}">${String(index).padStart(2, "0")}</text>
<text x="40" y="38" font-family="${SANS}" font-size="27" font-weight="700" letter-spacing="-0.3" fill="${t.title}">${esc(title)}</text>
<rect x="${lineX}" y="29" width="${W - lineX}" height="2" rx="1" fill="url(#line)"/>
<rect class="glint" x="0" y="28" width="80" height="4" rx="2" fill="url(#g)"/>`;
  return svg(W, H, title, body, css);
}

// ---------------------------------------------------------------------------------- project cards

const TERRA_MAP = [
  "....................",
  "...##.....####......",
  "..####...######..##.",
  "...###..#ss#####.##.",
  "....##..#sss###...#.",
  ".....#...###......#.",
  ".....##...##....###.",
  "......#....#.....##.",
  "...........#........",
  "....................",
];

function terraArt(mode, t, color) {
  const cx = 526, cy = 70, r = 40, px = 8, ox = cx - r, oy = cy - r, mapW = 20 * px;
  const fill = { "#": color, s: "#eab308" };
  let pixels = "";
  for (const copy of [0, 1]) {
    TERRA_MAP.forEach((row, y) => [...row].forEach((ch, x) => {
      if (fill[ch]) pixels += `<rect x="${ox + copy * mapW + x * px}" y="${oy + y * px}" width="${px}" height="${px}" fill="${fill[ch]}"/>`;
    }));
  }
  return `
<defs>
  <clipPath id="globe"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
  <radialGradient id="shade" cx="0.36" cy="0.3" r="0.75"><stop offset="0" stop-color="#ffffff" stop-opacity="0.28"/><stop offset="0.55" stop-color="#ffffff" stop-opacity="0"/><stop offset="1" stop-color="#000000" stop-opacity="0.45"/></radialGradient>
</defs>
<circle cx="${cx}" cy="${cy}" r="${r + 6}" fill="none" stroke="${color}" stroke-opacity="0.3" stroke-width="2"/>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.ocean}"/>
<g clip-path="url(#globe)"><g class="map">${pixels}</g></g>
<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#shade)"/>`;
}
const terraCss = `.map { animation: map 16s linear infinite; } @keyframes map { to { transform: translateX(-160px) } }`;

function battleArt(mode, t, color) {
  const ox = 481, oy = 25, cell = 16, gap = 3;
  const hits = [[1, 2], [2, 2], [3, 2]];
  const misses = [[0, 0], [3, 0], [4, 3], [1, 4], [2, 1]];
  let out = "";
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++)
    out += `<rect x="${ox + x * (cell + gap)}" y="${oy + y * (cell + gap)}" width="${cell}" height="${cell}" rx="3" fill="${t.track}"/>`;
  for (const [x, y] of misses)
    out += `<circle cx="${ox + x * (cell + gap) + cell / 2}" cy="${oy + y * (cell + gap) + cell / 2}" r="2.6" fill="${t.muted}"/>`;
  hits.forEach(([x, y], i) => {
    const cx = ox + x * (cell + gap) + cell / 2, cy = oy + y * (cell + gap) + cell / 2;
    out += `<g class="hit" style="animation-delay:${i * 0.7}s"><rect x="${cx - cell / 2}" y="${cy - cell / 2}" width="${cell}" height="${cell}" rx="3" fill="${color}"/><path d="M${cx - 4} ${cy - 4} L${cx + 4} ${cy + 4} M${cx + 4} ${cy - 4} L${cx - 4} ${cy + 4}" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></g>`;
    out += `<circle class="rip" style="animation-delay:${i * 0.7}s" cx="${cx}" cy="${cy}" r="14" fill="none" stroke="${color}" stroke-width="2"/>`;
  });
  return out;
}
const battleCss = `
.hit { opacity: 0; animation: hit 6s ease-out infinite; }
@keyframes hit { 0% { opacity: 0 } 6% { opacity: 1 } 80% { opacity: 1 } 92%, 100% { opacity: 0 } }
.rip { opacity: 0; transform-box: fill-box; transform-origin: center; animation: rip 6s ease-out infinite; }
@keyframes rip { 0% { opacity: .9; transform: scale(.3) } 14%, 100% { opacity: 0; transform: scale(1.5) } }`;

function clockArt(mode, t, color) {
  const cx = 524, cy = 66, r = 38;
  let ticks = "";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6, inner = i % 3 === 0 ? r - 10 : r - 6;
    ticks += `<line x1="${r1(cx + Math.cos(a) * inner)}" y1="${r1(cy + Math.sin(a) * inner)}" x2="${r1(cx + Math.cos(a) * (r - 3))}" y2="${r1(cy + Math.sin(a) * (r - 3))}"/>`;
  }
  return `
<circle cx="${cx}" cy="${cy}" r="${r}" fill="${t.track}" stroke="${color}" stroke-width="3"/>
<g stroke="${t.muted}" stroke-width="2" stroke-linecap="round">${ticks}</g>
<line class="hour" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 18}" stroke="${t.title}" stroke-width="4" stroke-linecap="round"/>
<line class="minute" x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 28}" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
<circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/>
<rect x="536" y="92" width="44" height="22" rx="11" fill="${color}"/>
<text x="558" y="107.5" text-anchor="middle" font-family="${MONO}" font-size="11.5" font-weight="800" fill="#1c1917">MCP</text>`;
}
const clockCss = `
.hour { transform-origin: 524px 66px; animation: spin 60s linear infinite; }
.minute { transform-origin: 524px 66px; animation: spin 6s linear infinite; }
@keyframes spin { to { transform: rotate(360deg) } }`;

function marketArt(mode, t, color) {
  const base = 112, heights = [28, 44, 36, 60, 80];
  let bars = "";
  const pts = [];
  heights.forEach((h, i) => {
    const x = 484 + i * 18;
    bars += `<rect class="bar" style="animation-delay:-${i * 0.5}s" x="${x}" y="${base - h}" width="12" height="${h}" rx="3" fill="${color}" opacity="${0.45 + i * 0.13}"/>`;
    pts.push(`${x + 6},${base - h - 10}`);
  });
  const [lx, ly] = pts.at(-1).split(",");
  return `
${bars}
<polyline class="trend" points="${pts.join(" ")}" fill="none" stroke="${t.accent2}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="${lx}" cy="${ly}" r="4.5" fill="${t.accent2}"/>
<line x1="478" y1="${base + 2}" x2="574" y2="${base + 2}" stroke="${t.muted}" stroke-width="1.5" stroke-linecap="round"/>`;
}
const marketCss = `
.bar { transform-box: fill-box; transform-origin: bottom; animation: bar 4s ease-in-out infinite; }
@keyframes bar { 0%, 100% { transform: scaleY(1) } 50% { transform: scaleY(.72) } }
.trend { stroke-dasharray: 160; animation: draw 5s ease-in-out infinite; }
@keyframes draw { 0% { stroke-dashoffset: 160 } 40%, 85% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: -160 } }`;

const LANG_COLORS = {
  TypeScript: "#3178c6", Python: "#3572a5", "C#": "#178600", JavaScript: "#f1e05a", Swift: "#f05138",
  GDScript: "#478cbf", HTML: "#e34c26", CSS: "#663399", Rust: "#dea584", MDX: "#fcb32c", "C++": "#f34b7d",
  Other: "#8b949e",
};

const PROJECTS = [
  {
    repo: "Terraweb", tags: "simulation · pixel art · local llm", lang: "TypeScript", color: "#22c55e",
    art: terraArt, css: terraCss,
    desc: "A 24/7 pixel-art simulation of the whole real Earth. Civilisations rise, trade, go to war and fade into legend, with nothing scripted. A local LLM plays god.",
  },
  {
    repo: "battleshipbench", title: "BattleshipBench", tags: "llm benchmark · elo · 0 deps", lang: "HTML", color: "#f43f5e",
    art: battleArt, css: battleCss,
    desc: "How well do language models play Battleship? A zero-dependency benchmark for spatial reasoning, memory and strict output, ranked with Elo.",
  },
  {
    repo: "TimeChimpMCP", tags: "mcp server · claude · api v2", lang: "JavaScript", color: "#f59e0b",
    art: clockArt, css: clockCss,
    desc: "An MCP server for the TimeChimp API. Lets Claude manage projects, hours, invoices, expenses and mileage straight from the chat.",
  },
  {
    repo: "Markt-analyse-tool", tags: "next.js · ai · strategy", lang: "TypeScript", color: "#3b82f6",
    art: marketArt, css: marketCss,
    desc: "AI-powered market analysis. Enter a company and get a SWOT, Porter's Five Forces, a BCG matrix and a competitor scan in seconds.",
  },
];

function card(mode, p, stars) {
  const t = THEMES[mode];
  const W = 600, H = 252;
  const lines = wrap(p.desc, 56).slice(0, 3);
  const langW = p.lang.length * 8.6;
  const meta = `
<circle cx="40" cy="217" r="6" fill="${LANG_COLORS[p.lang] ?? t.muted}"/>
<text x="54" y="222.5" font-family="${SANS}" font-size="15" fill="${t.muted}">${esc(p.lang)}</text>
${stars > 0 ? `<text x="${r1(54 + langW + 20)}" y="222.5" font-family="${SANS}" font-size="15" fill="${t.muted}">★ ${stars}</text>` : ""}
<text x="568" y="222.5" text-anchor="end" font-family="${MONO}" font-size="13.5" font-weight="700" fill="${t.accent}">view repo →</text>`;
  const body = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <radialGradient id="glow" cx="0.88" cy="0.18" r="0.62"><stop offset="0" stop-color="${p.color}" stop-opacity="${mode === "dark" ? 0.24 : 0.14}"/><stop offset="1" stop-color="${p.color}" stop-opacity="0"/></radialGradient>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#bg)" stroke="${t.border}" stroke-width="1.5"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#glow)"/>
<rect x="32" y="0.5" width="72" height="3.5" rx="1.75" fill="${p.color}"/>
${p.art(mode, t, p.color)}
<text x="32" y="64" font-family="${SANS}" font-size="28" font-weight="700" letter-spacing="-0.3" fill="${t.title}">${esc(p.title ?? p.repo)}</text>
<text x="32" y="92" font-family="${MONO}" font-size="13.5" letter-spacing="0.3" fill="${t.muted}">${esc(p.tags)}</text>
<text font-family="${SANS}" font-size="18" fill="${t.text}">${lines.map((l, i) => `<tspan x="32" y="${140 + i * 25}">${esc(l)}</tspan>`).join("")}</text>
${meta}`;
  return svg(W, H, `${p.title ?? p.repo}: ${p.desc}`, body, p.css);
}

// ---------------------------------------------------------------------------------------- datalab

// Only these app names and their summed commit counts end up in data/datalab.json, never other repo names.
const DATALAB_APPS = [
  { name: "STRICT", repos: ["STRICT"], tag: "interview research", color: ["#22d3ee", "#0891b2"], icon: "wave",
    desc: ["Transcribes, codes and analyses", "research interviews end to end."] },
  { name: "FORM", repos: ["FORM"], tag: "formative assessment", color: ["#34d399", "#059669"], icon: "rubric",
    desc: ["AI feedback on student work,", "checked against teacher rubrics."] },
  { name: "ATHENA", repos: ["ATHENA"], tag: "campus ai chat", color: ["#a78bfa", "#7c3aed"], icon: "owl",
    desc: ["AI chat for students and staff,", "with web search and file reading."] },
  { name: "SOS", repos: ["Slideshow-outline-studiov2", "Slideshow-Outline-Studio"], tag: "slide studio", color: ["#fb923c", "#ea580c"], icon: "slides",
    desc: ["Teachers chat a lesson into", "slides in the house style."] },
  { name: "AGENDATA", repos: ["AGENDATA"], tag: "synthetic data", color: ["#f472b6", "#db2777"], icon: "table",
    desc: ["Synthetic datasets on request,", "built for use in class."] },
  { name: "Platform", repos: ["APPS"], tag: "shared platform", color: ["#60a5fa", "#2563eb"], icon: "layers",
    desc: ["One portal and one login, with", "shared AI gateways for every app."] },
];

const OWL = [
  "#.......#",
  "##.....##",
  "#########",
  "#WW###WW#",
  "#WP###PW#",
  "####Y####",
  ".#BBBBB#.",
  ".#B#B#B#.",
  "..Y...Y..",
];

const DL_ICONS = {
  wave: (c) => [8, 20, 13, 28, 17, 24, 10]
    .map((h, k) => `<rect class="wv" style="animation-delay:-${(k * 0.18).toFixed(2)}s" x="${r1(5 + k * 4.6)}" y="${20 - h / 2}" width="2.8" height="${h}" rx="1.4" fill="${c}"/>`)
    .join(""),
  rubric: (c, t) => [0, 1, 2].map((k) => {
    const y = 9 + k * 11;
    return `<rect x="6" y="${y - 4}" width="8" height="8" rx="2" fill="none" stroke="${c}" stroke-width="1.6"/>`
      + `<path class="ck" style="animation-delay:${k * 0.5}s" d="M7.6 ${y} l2 2 l3.4 -4" fill="none" stroke="${c}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
      + `<rect x="18" y="${y - 1.5}" width="${[16, 11, 14][k]}" height="3" rx="1.5" fill="${t.muted}" opacity="0.7"/>`;
  }).join(""),
  owl: (c) => {
    const fill = { "#": [c, 1], B: [c, 0.5], W: ["#ffffff", 1], P: ["#111827", 1], Y: ["#f59e0b", 1] };
    let body = "", eyes = "";
    OWL.forEach((row, y) => [...row].forEach((ch, x) => {
      if (!fill[ch]) return;
      const px = `<rect x="${2 + x * 4}" y="${2 + y * 4}" width="4" height="4" fill="${fill[ch][0]}"${fill[ch][1] < 1 ? ` fill-opacity="${fill[ch][1]}"` : ""}/>`;
      if (ch === "W" || ch === "P") eyes += px; else body += px;
    }));
    return `${body}<g class="eye">${eyes}</g>`;
  },
  slides: (c, t) => `<rect x="9" y="6" width="26" height="18" rx="3" fill="${c}" fill-opacity="0.35"/>`
    + `<g class="sl"><rect x="5" y="12" width="28" height="20" rx="3" fill="${t.bg1}" stroke="${c}" stroke-width="1.8"/>`
    + `<rect x="9" y="16.5" width="14" height="3" rx="1.5" fill="${c}"/><rect x="9" y="22.5" width="19" height="2" rx="1" fill="${t.muted}"/>`
    + `<rect x="9" y="26.5" width="14" height="2" rx="1" fill="${t.muted}"/></g>`,
  table: (c) => {
    let s = "";
    for (let r = 0; r < 4; r++) for (let k = 0; k < 3; k++)
      s += `<rect${r ? ` class="cell" style="animation-delay:-${(((r * 3 + k) * 7) % 12 * 0.27).toFixed(2)}s"` : ""} x="${6 + k * 10}" y="${7 + r * 7}" width="8.5" height="5.5" rx="1.2" fill="${c}" fill-opacity="${r ? 0.3 : 0.95}"/>`;
    return s;
  },
  layers: (c) => [2, 1, 0]
    .map((k) => `<path${k === 0 ? ` class="top"` : ""} d="M20 ${8 + k * 8} L34 ${15 + k * 8} L20 ${22 + k * 8} L6 ${15 + k * 8} Z" fill="${c}" fill-opacity="${[1, 0.6, 0.3][k]}"/>`)
    .join(""),
};

const DATALAB_CSS = `
.wv { transform-box: fill-box; transform-origin: center; animation: wv 1.2s ease-in-out infinite; }
@keyframes wv { 0%, 100% { transform: scaleY(.45) } 50% { transform: scaleY(1) } }
.ck { stroke-dasharray: 10; animation: ck 3s ease-out infinite; }
@keyframes ck { 0% { stroke-dashoffset: 10 } 20%, 85% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 10 } }
.eye { transform-box: fill-box; transform-origin: center; animation: blink 4.5s infinite; }
@keyframes blink { 0%, 92%, 100% { transform: scaleY(1) } 96% { transform: scaleY(.15) } }
.sl { animation: bob 3.2s ease-in-out infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0) } 50% { transform: translateY(-2.5px) } }
.cell { animation: cell 3.2s ease-in-out infinite; }
@keyframes cell { 0%, 100% { fill-opacity: .22 } 50% { fill-opacity: .85 } }
.top { animation: bob 3s ease-in-out infinite; }
.pulse { animation: down 1.8s ease-in infinite; }
@keyframes down { 0% { transform: translateY(0); opacity: 0 } 20% { opacity: 1 } 100% { transform: translateY(22px); opacity: 0 } }`;

function dlTile(mode, t, app, x, y, w, h, commits) {
  const col = app.color[mode === "dark" ? 0 : 1];
  return `
<g transform="translate(${r1(x)} ${y})">
  <rect width="${r1(w)}" height="${h}" rx="14" fill="${t.bg1}" fill-opacity="${mode === "dark" ? 0.6 : 0.9}" stroke="${t.border}" stroke-width="1.2"/>
  <rect x="20" y="0" width="48" height="3" rx="1.5" fill="${col}"/>
  <rect x="20" y="20" width="44" height="44" rx="11" fill="${col}" fill-opacity="0.14"/>
  <g transform="translate(22 22)">${DL_ICONS[app.icon](col, t)}</g>
  <text x="78" y="40" font-family="${SANS}" font-size="21" font-weight="700" fill="${t.title}">${esc(app.name)}</text>
  <text x="78" y="60" font-family="${MONO}" font-size="12" fill="${t.muted}">${esc(app.tag)}</text>
  <text x="${r1(w - 18)}" y="39" text-anchor="end" font-family="${MONO}" font-size="13" font-weight="700" fill="${col}">${fmt(commits)}</text>
  <text x="${r1(w - 18)}" y="55" text-anchor="end" font-family="${MONO}" font-size="10.5" fill="${t.muted}">commits</text>
  <text font-family="${SANS}" font-size="15.5" fill="${t.text}">${app.desc.map((l, k) => `<tspan x="20" y="${98 + k * 22}">${esc(l)}</tspan>`).join("")}</text>
</g>`;
}

function datalabCard(mode, d) {
  const t = THEMES[mode];
  const W = 1000, P = 28, GAP = 16, TW = (W - 2 * P - 2 * GAP) / 3, TH = 146, Y1 = 120, Y2 = Y1 + TH + GAP;
  const stripY = Y2 + TH + 22, stripH = 50, H = stripY + stripH + 28;
  const tiles = DATALAB_APPS.map((app, i) =>
    dlTile(mode, t, app, P + (i % 3) * (TW + GAP), i < 3 ? Y1 : Y2, TW, TH, d.apps[app.name] ?? 0)).join("");
  let links = "";
  for (let c = 0; c < 3; c++) {
    const x = r1(P + c * (TW + GAP) + TW / 2);
    links += `<line x1="${x}" y1="${Y2 + TH}" x2="${x}" y2="${stripY}" stroke="${t.accent}" stroke-opacity="0.5" stroke-width="2" stroke-dasharray="3 4"/>`
      + `<circle class="pulse" style="animation-delay:${c * 0.6}s" cx="${x}" cy="${Y2 + TH}" r="3.5" fill="${t.accent2}"/>`;
  }
  const dot = `<tspan fill="${t.accent}">  ·  </tspan>`;
  const body = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <radialGradient id="glow" cx="0.92" cy="0.05" r="0.55"><stop offset="0" stop-color="${t.accent}" stop-opacity="${mode === "dark" ? 0.2 : 0.1}"/><stop offset="1" stop-color="${t.accent}" stop-opacity="0"/></radialGradient>
  <linearGradient id="num" x1="${W - 200}" y1="0" x2="${W - P}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent2}"/></linearGradient>
  <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="${t.accent}" fill-opacity="${mode === "dark" ? 0.16 : 0.2}"/></pattern>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#bg)" stroke="${t.border}" stroke-width="1.5"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#dots)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="20" fill="url(#glow)"/>
<text x="${P}" y="52" font-family="${MONO}" font-size="12.5" font-weight="700" letter-spacing="2.5" fill="${t.accent}">HR BUSINESS DATALAB · HOGESCHOOL ROTTERDAM</text>
<text x="${P}" y="90" font-family="${SANS}" font-size="29" font-weight="800" letter-spacing="-0.4" fill="${t.title}">AI apps for research &amp; education</text>
<text x="${W - P}" y="74" text-anchor="end" font-family="${SANS}" font-size="44" font-weight="800" letter-spacing="-1" fill="url(#num)">${fmt(d.total)}</text>
<text x="${W - P}" y="97" text-anchor="end" font-family="${MONO}" font-size="12" fill="${t.muted}">commits to the Datalab</text>
${tiles}
${links}
<rect x="${P}" y="${stripY}" width="${W - 2 * P}" height="${stripH}" rx="12" fill="${t.accent}" fill-opacity="0.08" stroke="${t.accent}" stroke-opacity="0.4" stroke-width="1.2"/>
<text x="${W / 2}" y="${stripY + 30.5}" text-anchor="middle" font-family="${MONO}" font-size="13.5" fill="${t.text}">one portal${dot}one login${dot}shared AI gateways${dot}every app in its own containers</text>`;
  const label = `HR Business Datalab, Hogeschool Rotterdam: ${DATALAB_APPS.map((a) => `${a.name} (${a.tag})`).join(", ")}. ${fmt(d.total)} commits.`;
  return svg(W, H, label, body, DATALAB_CSS);
}

// ------------------------------------------------------------------------------- languages + stats

const LANG_EXCLUDE = new Set(["Makefile", "ShaderLab", "GDShader", "PLpgSQL", "HLSL", "Dockerfile", "Procfile", "Batchfile"]);

function languagesCard(mode, sizes) {
  const t = THEMES[mode];
  const W = 600, H = 280;
  const entries = Object.entries(sizes).filter(([n]) => !LANG_EXCLUDE.has(n)).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  const top = entries.slice(0, 7);
  const other = total - top.reduce((s, [, v]) => s + v, 0);
  const rows = [...top, ["Other", other]].map(([name, v]) => ({ name, pct: (v / total) * 100 }));
  let x = 32, segs = "";
  rows.forEach((r, i) => {
    const w = (r.pct / 100) * 536;
    const gap = i < rows.length - 1 ? 2 : 0; // a hairline between segments keeps similar hues apart
    segs += `<rect x="${r1(x)}" y="98" width="${r1(Math.max(w - gap, 0.5))}" height="14" fill="${LANG_COLORS[r.name] ?? t.muted}"/>`;
    x += w;
  });
  let legend = "";
  rows.forEach((r, i) => {
    const col = i < 4 ? 0 : 1, row = i % 4;
    const lx = 32 + col * 284, ly = 152 + row * 32;
    legend += `<circle cx="${lx + 6}" cy="${ly - 5}" r="6" fill="${LANG_COLORS[r.name] ?? t.muted}"/>
<text x="${lx + 22}" y="${ly}" font-family="${SANS}" font-size="16" fill="${t.title}">${esc(r.name)}</text>
<text x="${lx + 250}" y="${ly}" text-anchor="end" font-family="${MONO}" font-size="14" fill="${t.muted}">${r.pct < 1 ? r.pct.toFixed(1) : r.pct.toFixed(1)}%</text>`;
  });
  const body = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <clipPath id="bar"><rect x="32" y="98" width="0" height="14" rx="7"><animate attributeName="width" from="0" to="536" dur="1.4s" begin="0.2s" fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.2 0.8 0.2 1"/></rect></clipPath>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#bg)" stroke="${t.border}" stroke-width="1.5"/>
<text x="32" y="50" font-family="${SANS}" font-size="22" font-weight="700" fill="${t.title}">Languages</text>
<text x="32" y="74" font-family="${MONO}" font-size="13" fill="${t.muted}">share of code · all ${"repos"} incl. private</text>
<rect x="32" y="98" width="536" height="14" rx="7" fill="${t.track}"/>
<g clip-path="url(#bar)">${segs}</g>
${legend}`;
  return svg(W, H, `Languages: ${rows.map((r) => `${r.name} ${r.pct.toFixed(1)}%`).join(", ")}`, body);
}

function statsCard(mode, s) {
  const t = THEMES[mode];
  const W = 600, H = 280;
  const bx = 32, bw = 536, by = 188, bh = 58, gap = 3;
  const n = s.weeks.length;
  const barW = (bw - gap * (n - 1)) / n;
  const max = Math.max(1, ...s.weeks.map((w) => w.total));
  let bars = "", labels = "", lastLabelX = -99, prevMonth = "";
  s.weeks.forEach((w, i) => {
    const h = w.total === 0 ? 2 : Math.max(3, bh * Math.pow(w.total / max, 0.75));
    const x = bx + i * (barW + gap);
    bars += `<rect class="b" style="animation-delay:${(i * 0.018).toFixed(3)}s" x="${r1(x)}" y="${r1(by + bh - h)}" width="${r1(barW)}" height="${r1(h)}" rx="1.5" fill="${w.total === 0 ? t.track : "url(#bars)"}"/>`;
    const month = w.firstDay.slice(5, 7);
    if (month !== prevMonth) {
      if (x - lastLabelX > 34 && x < bx + bw - 20) {
        labels += `<text x="${r1(x)}" y="${by + bh + 18}" font-family="${MONO}" font-size="11" fill="${t.muted}">${MONTHS[Number(month) - 1]}</text>`;
        lastLabelX = x;
      }
      prevMonth = month;
    }
  });
  const stat = (x, y, label, value) => `
<text x="${x}" y="${y}" font-family="${MONO}" font-size="11" font-weight="600" letter-spacing="1.2" fill="${t.muted}">${esc(label)}</text>
<text x="${x}" y="${y + 27}" font-family="${SANS}" font-size="23" font-weight="700" fill="${t.title}">${esc(value)}</text>`;
  const days = (d) => `${d} ${d === 1 ? "day" : "days"}`;
  const css = `.b { transform-box: fill-box; transform-origin: bottom; animation: grow 1s cubic-bezier(.2,.8,.2,1) both; }
@keyframes grow { from { transform: scaleY(0) } to { transform: scaleY(1) } }`;
  const body = `
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
  <linearGradient id="num" x1="32" y1="0" x2="260" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent}"/><stop offset="1" stop-color="${t.accent2}"/></linearGradient>
  <linearGradient id="bars" x1="0" y1="${by}" x2="0" y2="${by + bh}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${t.accent2}"/><stop offset="1" stop-color="${t.accent}"/></linearGradient>
</defs>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="18" fill="url(#bg)" stroke="${t.border}" stroke-width="1.5"/>
<text x="32" y="50" font-family="${SANS}" font-size="22" font-weight="700" fill="${t.title}">Contributions</text>
<text x="32" y="74" font-family="${MONO}" font-size="13" fill="${t.muted}">last 12 months · incl. private</text>
<text x="30" y="140" font-family="${SANS}" font-size="56" font-weight="800" letter-spacing="-1.5" fill="url(#num)">${fmt(s.lastYear)}</text>
<text x="32" y="166" font-family="${MONO}" font-size="12.5" fill="${t.muted}">contributions · ~${Math.round(s.allTime / Math.max(1, s.activeDays))} per active day</text>
${stat(318, 46, "CURRENT STREAK", days(s.current))}
${stat(452, 46, "LONGEST STREAK", days(s.longest))}
${stat(318, 108, "BEST DAY", fmt(s.best.count))}
${stat(452, 108, "ACTIVE DAYS", fmt(s.activeDays))}
${bars}
${labels}`;
  return svg(W, H, `${fmt(s.lastYear)} contributions in the last year. Current streak ${days(s.current)}, longest ${days(s.longest)}.`, body, css);
}

// ------------------------------------------------------------------------------------------- data

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-readme-builder" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (!res.ok || json.errors) throw new Error(`GitHub API ${res.status}: ${JSON.stringify(json.errors ?? json.message)}`);
  return json.data;
}

const CAL = `contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } }`;

async function fetchContributions() {
  const { user } = await gql(`query($login: String!) { user(login: $login) { createdAt contributionsCollection { ${CAL} } } }`, { login: LOGIN });
  const days = new Map();
  const first = new Date(user.createdAt).getUTCFullYear();
  const now = new Date();
  for (let y = first; y <= now.getUTCFullYear(); y++) {
    const to = y === now.getUTCFullYear() ? now.toISOString() : `${y}-12-31T23:59:59Z`;
    const d = await gql(
      `query($login: String!, $from: DateTime!, $to: DateTime!) { user(login: $login) { contributionsCollection(from: $from, to: $to) { ${CAL} } } }`,
      { login: LOGIN, from: `${y}-01-01T00:00:00Z`, to },
    );
    for (const w of d.user.contributionsCollection.contributionCalendar.weeks)
      for (const day of w.contributionDays) days.set(day.date, day.contributionCount);
  }
  const cal = user.contributionsCollection.contributionCalendar;
  for (const w of cal.weeks) for (const day of w.contributionDays) days.set(day.date, day.contributionCount);

  const sorted = [...days.entries()].sort(([a], [b]) => (a < b ? -1 : 1));
  let longest = 0, run = 0, allTime = 0, activeDays = 0, best = { count: 0, date: "" };
  for (const [date, count] of sorted) {
    allTime += count;
    if (count > 0) activeDays++;
    run = count > 0 ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (count > best.count) best = { count, date };
  }
  let i = sorted.length - 1, current = 0;
  if (i >= 0 && sorted[i][1] === 0) i--; // today may simply not have started yet
  for (; i >= 0 && sorted[i][1] > 0; i--) current++;

  const weeks = cal.weeks.map((w) => ({
    firstDay: w.contributionDays[0].date,
    total: w.contributionDays.reduce((s, d) => s + d.contributionCount, 0),
  }));
  return { lastYear: cal.totalContributions, allTime, activeDays, longest, current, best, weeks };
}

async function fetchLanguages() {
  const { user } = await gql(
    `query($login: String!) { user(login: $login) { repositories(first: 100, ownerAffiliations: OWNER, isFork: false) { nodes { languages(first: 20) { edges { size node { name } } } } } } }`,
    { login: LOGIN },
  );
  const sizes = {};
  for (const repo of user.repositories.nodes)
    for (const { size, node } of repo.languages.edges) sizes[node.name] = (sizes[node.name] ?? 0) + size;
  return Object.fromEntries(Object.entries(sizes).sort((a, b) => b[1] - a[1]));
}

async function rest(path) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: { Authorization: `bearer ${TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "profile-readme-builder" },
  });
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`GitHub API ${res.status} on ${path}`);
  return res.json();
}

/** My commit count per featured Datalab app, plus the total over every org repo (names of other repos are not kept). */
async function fetchDatalab() {
  const repos = [];
  for (let page = 1; ; page++) {
    const batch = await rest(`/orgs/${DATALAB_ORG}/repos?per_page=100&page=${page}`);
    repos.push(...batch);
    if (batch.length < 100) break;
  }
  const mine = {};
  for (const r of repos) {
    const people = await rest(`/repos/${DATALAB_ORG}/${r.name}/contributors?per_page=100`);
    const me = people.find((p) => p.login === LOGIN);
    if (me) mine[r.name] = me.contributions;
  }
  const apps = Object.fromEntries(DATALAB_APPS.map((a) => [a.name, a.repos.reduce((s, r) => s + (mine[r] ?? 0), 0)]));
  return { total: Object.values(mine).reduce((s, n) => s + n, 0), apps };
}

async function fetchStars() {
  const fields = PROJECTS.map((p, i) => `r${i}: repository(owner: "${LOGIN}", name: "${p.repo}") { stargazerCount }`).join(" ");
  const data = await gql(`query { ${fields} }`);
  return Object.fromEntries(PROJECTS.map((p, i) => [p.repo, data[`r${i}`]?.stargazerCount ?? 0]));
}

// ------------------------------------------------------------------------------------------- main

async function main() {
  mkdirSync(ASSETS, { recursive: true });
  const stars = TOKEN ? await fetchStars() : { TimeChimpMCP: 4 };
  let langs = JSON.parse(readFileSync(LANG_FILE, "utf8"));
  let datalab = JSON.parse(readFileSync(DATALAB_FILE, "utf8"));
  if (REFRESH_PRIVATE) {
    langs = await fetchLanguages();
    writeFileSync(LANG_FILE, JSON.stringify(langs, null, 2) + "\n");
    console.log("  ✓ data/languages.json");
    datalab = await fetchDatalab();
    writeFileSync(DATALAB_FILE, JSON.stringify(datalab, null, 2) + "\n");
    console.log("  ✓ data/datalab.json");
  }
  const stats = TOKEN ? await fetchContributions() : null;
  if (!stats) console.warn("  ! no GITHUB_TOKEN: contribution stats not refreshed");

  const sections = [
    ["about", "About"], ["datalab", "At the Datalab"], ["builds", "Side projects"], ["toolbox", "Toolbox"], ["numbers", "By the numbers"],
  ];
  for (const mode of ["dark", "light"]) {
    write(`banner-${mode}.svg`, banner(mode));
    write(`btn-site-${mode}.svg`, button(mode, "aswirc.nl", "globe"));
    write(`btn-linkedin-${mode}.svg`, button(mode, "LinkedIn", "linkedin", "#0a66c2"));
    write(`btn-datalab-${mode}.svg`, button(mode, "HR Business Datalab", "lab"));
    sections.forEach(([slug, title], i) => write(`title-${slug}-${mode}.svg`, sectionTitle(mode, i + 1, title)));
    write(`datalab-${mode}.svg`, datalabCard(mode, datalab));
    for (const p of PROJECTS) write(`card-${p.repo.toLowerCase()}-${mode}.svg`, card(mode, p, stars[p.repo] ?? 0));
    write(`languages-${mode}.svg`, languagesCard(mode, langs));
    if (stats) write(`stats-${mode}.svg`, statsCard(mode, stats));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
