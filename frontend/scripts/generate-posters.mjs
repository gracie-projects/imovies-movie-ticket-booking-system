// Generates the original SVG poster artwork for the fictional demo movies.
// Usage (from frontend/): node scripts/generate-posters.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/posters');
fs.mkdirSync(outDir, { recursive: true });

const POSTERS = [
  { slug: 'neon-horizon', title: ['NEON', 'HORIZON'], tag: 'THE FUTURE HAS A PULSE', c: ['#0f0c29', '#302b63', '#ff00cc'], art: 'city' },
  { slug: 'monsoon-letters', title: ['MONSOON', 'LETTERS'], tag: 'SOME PROMISES ARRIVE WITH THE RAIN', c: ['#0b2b26', '#1e5f74', '#9fd3c7'], art: 'rain' },
  { slug: 'the-clockmakers-heist', title: ["THE CLOCKMAKER'S", 'HEIST'], tag: 'EVERY SECOND IS PART OF THE PLAN', c: ['#1a1205', '#4a3410', '#f5c518'], art: 'clock' },
  { slug: 'kaadu-echoes-of-the-forest', title: ['KAADU', 'ECHOES OF THE FOREST'], tag: 'THE FOREST REMEMBERS', c: ['#071a0e', '#14532d', '#86efac'], art: 'forest' },
  { slug: 'laugh-track', title: ['LAUGH', 'TRACK'], tag: 'LIVE. UNSCRIPTED. OUT OF CONTROL.', c: ['#2a0a3d', '#ff6b35', '#ffe66d'], art: 'mic' },
  { slug: 'paper-lanterns', title: ['PAPER', 'LANTERNS'], tag: 'LIGHT THE WAY HOME', c: ['#0d1b3e', '#3b2c6b', '#ffb347'], art: 'lanterns' },
  { slug: 'iron-valley', title: ['IRON', 'VALLEY'], tag: 'ONE TOWN. ONE STAND.', c: ['#1c1c1c', '#5a2a0c', '#ff7b00'], art: 'mountains' },
  { slug: 'silent-frequency', title: ['SILENT', 'FREQUENCY'], tag: 'DO NOT ANSWER THE CALL', c: ['#050505', '#1a0b0b', '#e50914'], art: 'wave' },
];

function art(kind, [, mid, accent]) {
  switch (kind) {
    case 'city':
      return `<circle cx="300" cy="360" r="150" fill="url(#glow)"/>${Array.from({ length: 12 }, (_, i) => {
        const w = 30 + ((i * 37) % 40); const h = 160 + ((i * 71) % 260); const x = i * 52 - 10;
        return `<rect x="${x}" y="${720 - h}" width="${w}" height="${h}" fill="#0b0920" stroke="${accent}" stroke-opacity="0.5"/>`;
      }).join('')}<line x1="0" y1="560" x2="600" y2="560" stroke="${accent}" stroke-width="2" opacity="0.6"/>`;
    case 'rain':
      return `${Array.from({ length: 70 }, (_, i) => `<line x1="${(i * 53) % 600}" y1="${(i * 97) % 700}" x2="${((i * 53) % 600) - 12}" y2="${((i * 97) % 700) + 40}" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>`).join('')}
        <g transform="translate(300 420) rotate(-8)"><rect x="-120" y="-80" width="240" height="160" rx="6" fill="#f1ede1"/><path d="M-120 -80 L0 20 L120 -80" fill="none" stroke="${mid}" stroke-width="4"/><circle cx="80" cy="40" r="18" fill="#c0392b"/></g>`;
    case 'clock':
      return `<circle cx="300" cy="400" r="190" fill="none" stroke="${accent}" stroke-width="10"/><circle cx="300" cy="400" r="160" fill="none" stroke="${accent}" stroke-opacity="0.4" stroke-width="2"/>
        ${Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return `<line x1="${300 + 150 * Math.sin(a)}" y1="${400 - 150 * Math.cos(a)}" x2="${300 + 175 * Math.sin(a)}" y2="${400 - 175 * Math.cos(a)}" stroke="${accent}" stroke-width="6"/>`; }).join('')}
        <line x1="300" y1="400" x2="300" y2="280" stroke="#fff" stroke-width="8" stroke-linecap="round"/><line x1="300" y1="400" x2="390" y2="440" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="300" cy="400" r="12" fill="${accent}"/>`;
    case 'forest':
      return `<circle cx="300" cy="330" r="120" fill="url(#glow)"/>${Array.from({ length: 9 }, (_, i) => {
        const x = i * 75 - 20; const h = 300 + ((i * 53) % 160);
        return `<polygon points="${x},720 ${x + 45},${720 - h} ${x + 90},720" fill="#052e16" stroke="${accent}" stroke-opacity="0.35"/>`;
      }).join('')}`;
    case 'mic':
      return `<circle cx="300" cy="380" r="220" fill="url(#glow)"/><rect x="255" y="250" width="90" height="150" rx="45" fill="#222" stroke="${accent}" stroke-width="6"/>
        <path d="M225 360 Q225 470 300 470 Q375 470 375 360" fill="none" stroke="${accent}" stroke-width="8"/><line x1="300" y1="470" x2="300" y2="600" stroke="${accent}" stroke-width="8"/><line x1="240" y1="600" x2="360" y2="600" stroke="${accent}" stroke-width="8"/>`;
    case 'lanterns':
      return `${[[150, 300, 1], [320, 220, 1.3], [460, 360, 0.9], [240, 470, 0.8], [420, 540, 0.7]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="45" ry="60" fill="${accent}" opacity="0.9"/><ellipse cx="0" cy="0" rx="70" ry="85" fill="${accent}" opacity="0.15"/><rect x="-20" y="-68" width="40" height="10" fill="#7a3e00"/><rect x="-20" y="58" width="40" height="10" fill="#7a3e00"/></g>`).join('')}`;
    case 'mountains':
      return `<circle cx="300" cy="300" r="90" fill="${accent}" opacity="0.8"/><polygon points="0,720 160,380 300,560 440,330 600,720" fill="#2b1a10"/><polygon points="0,720 120,520 260,640 420,480 600,720" fill="#140c07"/>`;
    case 'wave':
      return `<path d="M0 400 ${Array.from({ length: 30 }, (_, i) => `L${i * 20 + 10} ${400 + (i % 2 ? -1 : 1) * (20 + ((i * 37) % 120))}`).join(' ')} L600 400" fill="none" stroke="${accent}" stroke-width="4"/><circle cx="300" cy="400" r="200" fill="none" stroke="${accent}" stroke-opacity="0.2" stroke-width="2"/>`;
    default:
      return '';
  }
}

for (const p of POSTERS) {
  const [bg1, bg2, accent] = p.c;
  const [line1, line2] = p.title;
  const big = line2.length > 12 ? 42 : 96;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" width="600" height="900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${accent}" stop-opacity="0.55"/><stop offset="1" stop-color="${accent}" stop-opacity="0"/></radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.9"/></linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  ${art(p.art, p.c)}
  <rect width="600" height="900" fill="url(#fade)"/>
  <text x="300" y="${line2.length > 12 ? 720 : 700}" text-anchor="middle" font-family="Impact, 'Bebas Neue', 'Arial Narrow', sans-serif" font-size="${line1.length > 10 ? 52 : 96}" fill="#fff" letter-spacing="4">${line1.replace("'", '&#39;')}</text>
  <text x="300" y="${line2.length > 12 ? 775 : 795}" text-anchor="middle" font-family="Impact, 'Bebas Neue', 'Arial Narrow', sans-serif" font-size="${big}" fill="${accent}" letter-spacing="4">${line2}</text>
  <text x="300" y="850" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#ddd" letter-spacing="5">${p.tag}</text>
  <text x="300" y="60" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#fff" fill-opacity="0.6" letter-spacing="8">AN IMOVIES ORIGINAL</text>
</svg>
`;
  fs.writeFileSync(path.join(outDir, `${p.slug}.svg`), svg);
}

fs.writeFileSync(
  path.resolve(outDir, '../favicon.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0b12"/><rect x="8" y="16" width="48" height="32" rx="5" fill="#e50914"/><text x="32" y="42" text-anchor="middle" font-family="Impact, sans-serif" font-size="26" fill="#f5c518">IM</text></svg>\n`,
);
console.log(`Generated ${POSTERS.length} posters in ${outDir}`);
