/**
 * news-memes.mjs — every voice gets a VISUAL signature, not just a verbal one.
 *
 * The desk's "meme" was a string on a shared card: same layout every time, with
 * a different sentence in it. That is a pull quote, not a meme. A reader
 * scrolling past should recognise WHO made a panel before reading a word of it,
 * the way you knew a newspaper cartoonist by their line.
 *
 * Seven registers, one per voice:
 *   cartoon    NIB   — old broadsheet editorial panel, engraved motif, period caption
 *   chart      DOT   — a literal flat line and a deadpan caption. His bit, drawn
 *   receipt    MARA  — a document with paragraph nine highlighted
 *   thenNow    ECHO  — split panel, two years, same picture
 *   pager      VERA  — a 3 A.M. alert
 *   declare    REX   — big-type declaration over a steep curve
 *   oneperson  JUNO  — one figure, one caption
 *
 * Everything is deterministic SVG rasterized by the build. No diffusion, no
 * per-image cost, no roulette — and the style is period-appropriate: the satire
 * this imitates WAS high-contrast line work, because that is what a press could
 * print. Symbolic composition is the idiom, not a limitation being worked
 * around.
 */

import { escapeXml, wrapTitle } from './og-template.mjs';

const W = 1200;
const H = 630;

/* ── Shared ink ────────────────────────────────────────────────────────── */

const PAPER = '#efe7d4';
const INK = '#171310';
const DARK = '#0c0d12';
const PANEL = '#131722';

const lines = (text, cols, max) => wrapTitle(String(text || ''), cols).slice(0, max);

const caption = (text, { x = 80, y, size = 30, fill = INK, cols = 58, max = 3, anchor = 'start', style = '' }) =>
  lines(text, cols, max)
    .map((ln, i) => `<text x="${x}" y="${y + i * (size * 1.28)}" text-anchor="${anchor}" font-family="Georgia, serif" font-size="${size}" fill="${fill}" ${style}>${escapeXml(ln)}</text>`)
    .join('\n  ');

/** Aged stock: subtle speckle so it reads as paper rather than a beige box. */
const paperTexture = (seed = 7) => {
  let n = seed;
  const rnd = () => { n = (n * 1103515245 + 12345) % 2147483648; return n / 2147483648; };
  return Array.from({ length: 90 }, () => {
    const cx = Math.round(rnd() * W);
    const cy = Math.round(rnd() * H);
    const r = (rnd() * 1.6 + 0.3).toFixed(1);
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#000" opacity="0.045"/>`;
  }).join('');
};

/* ── Motifs: the symbolic vocabulary of the engraved era ───────────────── */

/**
 * Period cartoons drew SYMBOLS — the machine, the ladder, the open door, the
 * queue — not likenesses. That keeps the satire aimed at institutions rather
 * than individuals, which is also NIB's standing rule.
 */
export const MOTIFS = {
  machine: `<g stroke="${INK}" stroke-width="7" fill="none">
      <rect x="470" y="150" width="260" height="200" rx="10"/>
      <circle cx="600" cy="250" r="54"/><circle cx="600" cy="250" r="18" fill="${INK}"/>
      <path d="M600 150 v-42 M600 350 v42 M470 250 h-46 M730 250 h46"/>
      <path d="M524 190 l-30 -30 M676 190 l30 -30 M524 310 l-30 30 M676 310 l30 30"/>
    </g>`,
  ladder: `<g stroke="${INK}" stroke-width="7" fill="none">
      <path d="M520 400 L560 130 M700 400 L660 130"/>
      <path d="M534 310 h140 M546 250 h128 M558 190 h116 M570 140 h104"/>
    </g>`,
  door: `<g stroke="${INK}" stroke-width="7" fill="none">
      <rect x="500" y="120" width="200" height="270"/>
      <path d="M700 120 l70 -34 v270 l-70 34"/>
      <circle cx="668" cy="262" r="9" fill="${INK}"/>
    </g>`,
  // The torso MUST terminate exactly where the legs meet. The first version ran
  // the body to y=300 while the legs apexed at y=270, leaving a 30px stroke
  // hanging between the legs — which read as crude anatomy on a live public
  // page (founder-reported, S309). Arms added so the figure is legibly a person
  // rather than a stick with limbs. Any change here must be re-rendered and
  // LOOKED AT: this defect is invisible in the path data and obvious in the pixels.
  queue: `<g stroke="${INK}" stroke-width="7" fill="none" stroke-linecap="round">
      ${[0, 1, 2, 3, 4].map((i) => `<g transform="translate(${430 + i * 84},0)"><circle cx="60" cy="176" r="26"/><path d="M60 202 v76"/><path d="M30 232 h60"/><path d="M60 278 l-26 52 M60 278 l26 52"/></g>`).join('')}
      <path d="M420 380 h380" stroke-dasharray="14 12"/>
    </g>`,
  // Every motif must live inside y≈130–410. The panel rules sit at y=116 and
  // y=432, and the first draft's lightning ran to y≈468 — straight through the
  // caption rule and into the text. A cartoon whose ink crosses its own frame
  // reads as a rendering bug, not a drawing.
  storm: `<g stroke="${INK}" stroke-width="7" fill="none">
      <path d="M470 232 a88 88 0 1 1 176 0 a64 64 0 1 1 64 64 H516 a64 64 0 0 1 -46 -64z"/>
      <path d="M572 312 l-30 54 h40 l-28 44"/>
      <path d="M672 320 v34 M716 320 v26"/>
    </g>`,
  scales: `<g stroke="${INK}" stroke-width="7" fill="none">
      <path d="M600 120 v250 M520 400 h160"/>
      <path d="M470 180 h260"/>
      <path d="M470 180 l-44 78 h88z"/><path d="M730 180 l-44 108 h88z"/>
    </g>`,
};

export const motifKeys = Object.keys(MOTIFS);
/** Deterministic motif when an author does not pick one. */
export const motifFor = (seedText) => {
  const s = String(seedText || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 100000;
  return motifKeys[h % motifKeys.length];
};

/* ── The seven registers ───────────────────────────────────────────────── */

function cartoon({ text, motif, date }) {
  const key = MOTIFS[motif] ? motif : motifFor(text);
  return `<rect width="${W}" height="${H}" fill="${PAPER}"/>${paperTexture()}
  <rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${INK}" stroke-width="5"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="${INK}" stroke-width="2"/>
  <text x="600" y="96" text-anchor="middle" font-family="Georgia, serif" font-size="24" fill="${INK}" letter-spacing="9">THE DESK · CARTOON</text>
  <line x1="80" y1="116" x2="1120" y2="116" stroke="${INK}" stroke-width="2"/>
  ${MOTIFS[key]}
  <line x1="80" y1="432" x2="1120" y2="432" stroke="${INK}" stroke-width="2"/>
  ${caption(text, { x: 600, y: 486, size: 33, cols: 52, max: 2, anchor: 'middle', style: 'font-style="italic"' })}
  <text x="1120" y="586" text-anchor="end" font-family="Georgia, serif" font-size="26" fill="${INK}" font-style="italic">— NIB</text>
  <text x="80" y="586" font-family="Georgia, serif" font-size="20" fill="${INK}" opacity="0.75">${escapeXml(date || '')}</text>`;
}

function chart({ text, accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <text x="80" y="92" font-family="Georgia, serif" font-size="26" fill="#9aa4b8" letter-spacing="7">DOT · THE CHART</text>
  <g stroke="#2a3142" stroke-width="2">${[0, 1, 2, 3].map((i) => `<line x1="80" y1="${190 + i * 60}" x2="1120" y2="${190 + i * 60}"/>`).join('')}</g>
  <line x1="80" y1="430" x2="1120" y2="430" stroke="#3a4256" stroke-width="3"/>
  <line x1="80" y1="310" x2="1120" y2="310" stroke="${accent}" stroke-width="9" stroke-linecap="round"/>
  ${caption(text, { y: 520, size: 34, cols: 50, max: 2, fill: '#fafafa' })}`;
}

function receipt({ text, accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <rect x="80" y="70" width="470" height="490" fill="${PAPER}"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => `<rect x="112" y="${112 + i * 40}" width="${i === 8 ? 390 : 300 + (i % 3) * 40}" height="12" fill="${i === 8 ? accent : '#c9c0ad'}"/>`).join('')}
  <rect x="104" y="424" width="406" height="28" fill="none" stroke="${accent}" stroke-width="4"/>
  <text x="112" y="590" font-family="Georgia, serif" font-size="22" fill="#7c8598">¶ 9</text>
  <text x="610" y="130" font-family="Georgia, serif" font-size="26" fill="#9aa4b8" letter-spacing="7">MARA · THE RECEIPT</text>
  ${caption(text, { x: 610, y: 250, size: 36, cols: 26, max: 5, fill: '#fafafa' })}`;
}

function thenNow({ text, then = '2011', now = 'Now', accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <line x1="600" y1="70" x2="600" y2="430" stroke="#3a4256" stroke-width="3"/>
  <text x="300" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="#5a637a">${escapeXml(then)}</text>
  <text x="900" y="150" text-anchor="middle" font-family="Georgia, serif" font-size="64" fill="${accent}">${escapeXml(now)}</text>
  <g stroke="#6b7governance" />
  <g stroke="#6b748c" stroke-width="7" fill="none" transform="translate(180,210) scale(0.85)">${MOTIFS.machine}</g>
  <g stroke="${accent}" stroke-width="7" fill="none" transform="translate(780,210) scale(0.85)">${MOTIFS.machine}</g>
  ${caption(text, { x: 600, y: 510, size: 34, cols: 50, max: 2, anchor: 'middle', fill: '#fafafa' })}`;
}

function pager({ text, accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <rect x="80" y="120" width="1040" height="300" rx="18" fill="${PANEL}" stroke="${accent}" stroke-width="4"/>
  <circle cx="140" cy="180" r="14" fill="${accent}"/>
  <text x="176" y="190" font-family="Inter, sans-serif" font-size="26" fill="${accent}" letter-spacing="4">PAGE · 03:14</text>
  ${caption(text, { x: 140, y: 268, size: 38, cols: 38, max: 3, fill: '#fafafa' })}
  <text x="80" y="530" font-family="Georgia, serif" font-size="26" fill="#9aa4b8" letter-spacing="6">VERA · 3 A.M.</text>`;
}

function declare({ text, accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <path d="M80 520 C 420 500, 760 420, 1120 110" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <circle cx="1120" cy="110" r="16" fill="${accent}"/>
  ${caption(text, { y: 210, size: 62, cols: 22, max: 3, fill: '#fafafa' })}
  <text x="80" y="590" font-family="Georgia, serif" font-size="24" fill="#9aa4b8" letter-spacing="6">REX</text>`;
}

function oneperson({ text, accent }) {
  return `<rect width="${W}" height="${H}" fill="${DARK}"/>
  <g stroke="${accent}" stroke-width="8" fill="none" transform="translate(120,150) scale(1.5)">
    <circle cx="60" cy="40" r="26"/><path d="M60 68 v92 M30 180 l30 -50 30 50 M60 96 l-34 26 M60 96 l34 26"/>
  </g>
  ${caption(text, { x: 420, y: 260, size: 42, cols: 26, max: 4, fill: '#fafafa' })}
  <text x="420" y="560" font-family="Georgia, serif" font-size="24" fill="#9aa4b8" letter-spacing="6">JUNO</text>`;
}

const REGISTERS = { cartoon, chart, receipt, thenNow, pager, declare, oneperson };

/**
 * Render a persona's meme. Falls back to the cartoon register for any voice
 * without its own — a missing style should still produce a real panel rather
 * than an empty card.
 */
export function renderMemeSvg({ style, text, motif, date, accent = '#ffc400', then, now }) {
  const draw = REGISTERS[style] || REGISTERS.cartoon;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${draw({ text, motif, date, accent, then, now })}
</svg>`;
}

export const registerNames = Object.keys(REGISTERS);

/**
 * Alt text derived from the register that will actually be drawn (S309).
 *
 * These panels are deterministic SVG: the register decides the picture, so the
 * description of the picture must come from the register too. Hand-written alt
 * drifted twice in one session — a panel declared `motif: "gears"` was drawn as
 * a row of figures while its alt described "two clockwork figures searching each
 * other's pockets", and JUNO's register ignores motifs entirely, so an alt
 * describing "an engraved balance" sat on a panel showing a single figure.
 *
 * Both passed every gate, because no gate compares words to pixels. A sighted
 * reader saw the real panel; a screen-reader user was told about a picture that
 * was never drawn. Deriving the description removes the drift by construction.
 */
export function altForMeme({ style, text, motif = null, persona = null }) {
  const scene = {
    cartoon: motif && MOTIFS[motif]
      ? `An engraved ${motif} in a ruled newspaper panel`
      : 'An engraved newspaper cartoon panel',
    chart: 'A stark single-line chart',
    receipt: 'A document with one paragraph highlighted',
    thenNow: 'A two-panel then-and-now split',
    pager: 'A pager alert screen',
    declare: 'A large declarative statement card',
    oneperson: 'A single figure beside the line',
  }[style] || 'An illustrated panel';
  const who = persona ? `, signed ${persona}` : '';
  return `${scene}${who}, captioned: “${String(text).trim()}”`;
}
