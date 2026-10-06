// Design-token lint: WCAG contrast + sRGB gamut for every chapter hue, light and dark.
// Mirrors the formulas in public/css/tokens.css (mixes are approximated in OKLab).   node tools/check-contrast.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hues = JSON.parse(readFileSync(join(root, 'content/syllabus.json'), 'utf8')).chapters.map((c) => [c.id, c.hue]);

const rad = (d) => (d * Math.PI) / 180;
const toLab = ([L, C, H]) => [L, C * Math.cos(rad(H)), C * Math.sin(rad(H))];
const oklabToLinear = ([L, a, b]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
const inGamut = (rgb) => rgb.every((v) => v >= -0.0005 && v <= 1.0005);
const lum = (rgb) => { const [r, g, b] = rgb.map((v) => Math.min(1, Math.max(0, v))); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const mix = (a, b, pct) => a.map((v, i) => v * pct + b[i] * (1 - pct)); // a at pct, b for the rest (in OKLab)
const lin = (oklch) => oklabToLinear(toLab(oklch));
const labOf = (oklch) => toLab(oklch);

const THEMES = {
  light: { surface: [0.995, 0.004, 85], surface2: [0.961, 0.009, 85], ink: [0.23, 0.016, 60], ink3: [0.53, 0.013, 60], al: 0.54, ac: 0.12, acc2: 0.82, soft1: 0.08, accentInk: [0.99, 0.004, 85] },
  dark: { surface: [0.225, 0.013, 70], surface2: [0.175, 0.011, 70], ink: [0.945, 0.008, 80], ink3: [0.64, 0.01, 80], al: 0.76, ac: 0.11, acc2: 0.88, soft1: 0.1, accentInk: [0.19, 0.02, 70] },
};

let bad = 0;
const rows = [];
for (const [name, T] of Object.entries(THEMES)) {
  for (const [id, hue] of hues) {
    const lime = hue % 360 >= 80 && hue % 360 <= 150;
    const L = name === 'light' && lime ? 0.5 : T.al;
    let C = T.ac;
    let accent = lin([L, C, hue % 360]);
    let clipped = false;
    while (!inGamut(accent) && C > 0.02) { C -= 0.005; accent = lin([L, C, hue % 360]); clipped = true; }
    const accLab = labOf([L, C, hue % 360]);
    const acc2 = oklabToLinear(mix(accLab, labOf(T.ink), T.acc2));
    const surface = lin(T.surface);
    const soft = oklabToLinear(mix(accLab, labOf(T.surface), T.soft1));
    const checks = {
      'accent-2 text on page': [contrast(acc2, surface), 4.5],
      'accent-2 text on tint': [contrast(acc2, soft), 4.5],
      'button label on accent': [contrast(lin(T.accentInk), accent), 4.5],
      'accent as UI on page': [contrast(accent, surface), 3],
    };
    for (const [k, [v, min]] of Object.entries(checks)) {
      if (v < min) { bad++; rows.push(`  ✖ ${name} ${id} hue ${hue}: ${k} = ${v.toFixed(2)} (needs ${min})`); }
    }
    if (clipped) rows.push(`  ! ${name} ${id} hue ${hue}: chroma reduced to ${C.toFixed(3)} to stay in sRGB`);
  }
  const t3 = contrast(lin(T.ink3), lin(T.surface));
  const t32 = contrast(lin(T.ink3), lin(T.surface2));
  if (t3 < 4.5 || t32 < 4.5) { bad++; rows.push(`  ✖ ${name}: secondary text (ink-3) = ${t3.toFixed(2)} on surface, ${t32.toFixed(2)} on surface-2 (needs 4.5)`); }
}
console.log(rows.length ? rows.join('\n') : '  all chapter accents pass');
console.log(`\n${bad ? '✖' : '✔'} ${bad} contrast failure(s) across ${hues.length} hues × 2 themes`);
process.exit(bad ? 1 : 0);
