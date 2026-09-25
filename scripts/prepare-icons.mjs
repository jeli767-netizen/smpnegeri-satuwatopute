import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outputDir = path.join(root, 'build');
const svgPath = path.join(outputDir, 'icon-source.svg');
const pngPath = path.join(outputDir, 'icon.png');
const icoPath = path.join(outputDir, 'icon.ico');

await fs.mkdir(outputDir, { recursive: true });

// Replace this SVG with the official school logo when available.
const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e3a8a"/>
      <stop offset="1" stop-color="#0f2b5c"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="180" fill="url(#bg)"/>
  <path d="M512 170 790 275v205c0 190-116 310-278 374-162-64-278-184-278-374V275z" fill="#fff" opacity=".96"/>
  <path d="M512 215 742 302v174c0 157-93 257-230 316-137-59-230-159-230-316V302z" fill="#2563eb"/>
  <path d="M368 430h288v42H368zm0 82h288v42H368zm72-164h144v42H440z" fill="#fff"/>
  <text x="512" y="690" text-anchor="middle" font-family="Arial, sans-serif" font-size="84" font-weight="700" fill="#fff">SPMB</text>
  <text x="512" y="770" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#dbeafe">WATOPUTE</text>
</svg>`;

await fs.writeFile(svgPath, svg, 'utf8');
await sharp(Buffer.from(svg)).resize(1024, 1024).png().toFile(pngPath);
await sharp(Buffer.from(svg)).resize(256, 256).png().toFormat('ico').toFile(icoPath);

console.log(`Created ${path.relative(root, pngPath)} and ${path.relative(root, icoPath)}`);
