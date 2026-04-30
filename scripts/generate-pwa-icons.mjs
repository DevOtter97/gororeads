#!/usr/bin/env node
// Genera los iconos PWA a partir de public/favicon.svg.
// Ejecutar manualmente cuando cambie el favicon: `node scripts/generate-pwa-icons.mjs`
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const SVG_PATH = resolve(ROOT, 'public/favicon.svg');
const OUT_DIR = resolve(ROOT, 'public/icons');

mkdirSync(OUT_DIR, { recursive: true });
const svg = readFileSync(SVG_PATH);

// Targets: any-purpose (transparent background), apple-touch-icon (sin transparencia,
// fondo solido), maskable (con padding extra para safe area de adaptive icons).
const targets = [
    { size: 192, name: 'icon-192.png', purpose: 'any' },
    { size: 512, name: 'icon-512.png', purpose: 'any' },
    { size: 180, name: 'apple-touch-icon.png', purpose: 'apple' },
    { size: 512, name: 'icon-maskable-512.png', purpose: 'maskable' },
];

const BG_COLOR = { r: 10, g: 10, b: 15, alpha: 1 }; // var(--bg-primary)

for (const t of targets) {
    let img = sharp(svg, { density: 384 }).resize(t.size, t.size);

    if (t.purpose === 'apple') {
        // iOS no soporta transparencia bien en home screen; ponemos fondo oscuro.
        img = sharp(svg, { density: 384 })
            .resize(Math.round(t.size * 0.7), Math.round(t.size * 0.7))
            .extend({
                top: Math.round(t.size * 0.15),
                bottom: Math.round(t.size * 0.15),
                left: Math.round(t.size * 0.15),
                right: Math.round(t.size * 0.15),
                background: BG_COLOR,
            })
            .flatten({ background: BG_COLOR });
    } else if (t.purpose === 'maskable') {
        // Maskable requiere safe area: el icono debe caber en el 80% central.
        img = sharp(svg, { density: 384 })
            .resize(Math.round(t.size * 0.6), Math.round(t.size * 0.6))
            .extend({
                top: Math.round(t.size * 0.2),
                bottom: Math.round(t.size * 0.2),
                left: Math.round(t.size * 0.2),
                right: Math.round(t.size * 0.2),
                background: BG_COLOR,
            })
            .flatten({ background: BG_COLOR });
    }

    const outPath = resolve(OUT_DIR, t.name);
    await img.png({ compressionLevel: 9 }).toFile(outPath);
    console.log(`✓ ${t.name} (${t.size}x${t.size}, ${t.purpose})`);
}

console.log('\nDone. Iconos en public/icons/');
