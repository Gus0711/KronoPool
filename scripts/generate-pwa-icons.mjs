/**
 * Génère les icônes PWA (PNG) à partir des sources SVG « Lagon ».
 * - favicon.svg           → pwa-192x192.png, pwa-512x512.png (purpose any)
 * - icon-maskable.svg     → pwa-maskable-512x512.png (purpose maskable)
 *                          + apple-touch-icon-180x180.png (fond teal, sans alpha)
 *
 * Exécution : `node scripts/generate-pwa-icons.mjs`. Relancer après avoir remplacé
 * une source SVG par un logo plus fin.
 */
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const DENSITY = 2048; // rendu haute résolution du SVG 32×32 avant réduction (netteté)
const dir = 'static';
const any = readFileSync(`${dir}/favicon.svg`);
const maskable = readFileSync(`${dir}/icon-maskable.svg`);

await sharp(any, { density: DENSITY }).resize(192, 192).png().toFile(`${dir}/pwa-192x192.png`);
await sharp(any, { density: DENSITY }).resize(512, 512).png().toFile(`${dir}/pwa-512x512.png`);
await sharp(maskable, { density: DENSITY })
	.resize(512, 512)
	.png()
	.toFile(`${dir}/pwa-maskable-512x512.png`);
await sharp(maskable, { density: DENSITY })
	.resize(180, 180)
	.flatten({ background: '#155e75' }) // iOS n'aime pas la transparence
	.png()
	.toFile(`${dir}/apple-touch-icon-180x180.png`);

console.log('✓ Icônes PWA générées dans static/.');
