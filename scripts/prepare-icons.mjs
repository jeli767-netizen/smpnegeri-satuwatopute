import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'build');
const svgPath = path.join(outputDir, 'icon-source.svg');
const pngPath = path.join(outputDir, 'icon.png');
const icoPath = path.join(outputDir, 'icon.ico');

await fs.mkdir(outputDir, { recursive: true });

// Formal school-brand template. Replace the central emblem/text with the
// official school logo when the approved artwork is available.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="navy" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#123b78"/>
      <stop offset="1" stop-color="#071d40"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffe9a3"/>
      <stop offset="1" stop-color="#c99224"/>
    </linearGradient>
  </defs>

  <rect width="1024" height="1024" rx="160" fill="#f7f9fc"/>
  <circle cx="512" cy="512" r="402" fill="url(#navy)" stroke="url(#gold)" stroke-width="28"/>
  <circle cx="512" cy="512" r="350" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="4"/>

  <path d="M512 190 760 285v174c0 170-101 280-248 347-147-67-248-177-248-347V285z" fill="#fff"/>
  <path d="M512 230 720 309v145c0 141-80 237-208 299-128-62-208-158-208-299V309z" fill="#1d4ed8"/>

  <path d="M380 408h264v34H380zm0 72h264v34H380z" fill="#fff"/>
  <path d="M432 355h160v38H432z" fill="#fff"/>
  <path d="M512 354v160" stroke="#fff" stroke-width="18"/>
  <path d="M430 540h164l-82 88z" fill="url(#gold)"/>

  <text x="512" y="705" text-anchor="middle" font-family="Arial, sans-serif" font-size="76" font-weight="700" letter-spacing="8" fill="#fff">SPMB</text>
  <text x="512" y="770" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" font-weight="700" letter-spacing="3" fill="#ffe9a3">SMP NEGERI 1</text>
  <text x="512" y="812" text-anchor="middle" font-family="Arial, sans-serif" font-size="31" font-weight="700" letter-spacing="5" fill="#ffe9a3">WATOPUTE</text>

  <circle cx="512" cy="125" r="10" fill="#ffe9a3"/>
  <circle cx="512" cy="899" r="10" fill="#ffe9a3"/>
</svg>`;

await fs.writeFile(svgPath, svg, 'utf8');
await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(pngPath);
await sharp(Buffer.from(svg)).resize(256, 256).png().toFormat('ico').toFile(icoPath);

console.log(`Created ${path.relative(root, pngPath)} and ${path.relative(root, icoPath)}`);
