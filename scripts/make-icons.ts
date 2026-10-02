// Иконите на апликацијата (PNG) без нова зависност: топол преливник и меури, како
// кошничката. Употреба: node scripts/make-icons.ts  → public/icon-*.png

import { writeFileSync } from "node:fs";
import path from "node:path";
import { deflateSync } from "node:zlib";

type RGB = [number, number, number];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function png(size: number, pixel: (x: number, y: number) => RGB): Buffer {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const i = y * (size * 3 + 1) + 1 + x * 3;
      raw[i] = r;
      raw[i + 1] = g;
      raw[i + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // битови по боја
  ihdr[9] = 2; // RGB
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as RGB;
const SAND: RGB = [246, 230, 207];
const AMBER: RGB = [243, 167, 107];
const RUST: RGB = [194, 65, 12];
const WHITE: RGB = [255, 250, 244];

/** Боја во точка (0..1): преливник од горе лево, три меури. Сè е во средишниот безбеден круг (maskable). */
function color(u: number, v: number): RGB {
  const d = Math.hypot(u - 0.2, v - 0.1) / 1.2;
  let c = d < 0.5 ? mix(SAND, AMBER, d / 0.5) : mix(AMBER, RUST, Math.min(1, (d - 0.5) / 0.5));
  const bubbles: [number, number, number][] = [
    [0.43, 0.45, 0.17],
    [0.64, 0.6, 0.12],
    [0.4, 0.68, 0.08],
  ];
  for (const [cx, cy, r] of bubbles) {
    const dist = Math.hypot(u - cx, v - cy);
    if (dist < r) c = mix(c, WHITE, 0.92);
    else if (dist < r + 0.012) c = mix(c, WHITE, 0.35);
  }
  return c;
}

function icon(size: number): Buffer {
  const S = 3; // примероци по пиксел по оска (мазни рабови)
  return png(size, (x, y) => {
    const acc = [0, 0, 0];
    for (let i = 0; i < S; i++)
      for (let j = 0; j < S; j++) {
        const c = color((x + (i + 0.5) / S) / size, (y + (j + 0.5) / S) / size);
        acc[0] += c[0];
        acc[1] += c[1];
        acc[2] += c[2];
      }
    return acc.map((v) => Math.round(v / (S * S))) as RGB;
  });
}

const out = path.join(import.meta.dirname, "..", "public");
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-icon.png", 180]] as const) {
  writeFileSync(path.join(out, name), icon(size));
  console.log(`public/${name} (${size}×${size})`);
}
