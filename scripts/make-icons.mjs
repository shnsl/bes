import { readFileSync } from "node:fs";
import sharp from "sharp";

const source = sharp(readFileSync("assets/icon-source.jpg")).rotate();
const meta = await source.metadata();
const side = Math.min(meta.width, meta.height);
const base = source.extract({
  left: Math.floor((meta.width - side) / 2),
  top: Math.floor((meta.height - side) / 2),
  width: side,
  height: side,
});

const sample = await base.clone().resize(8, 8, { fit: "fill" }).raw().toBuffer();
const navy = { r: sample[0], g: sample[1], b: sample[2], alpha: 1 };

async function square(size) {
  return base.clone().resize(size, size, { fit: "cover" }).png().toBuffer();
}

async function maskable(size) {
  const inner = Math.round(size * 0.8);
  const scaled = Math.round(inner * 1.4);
  const offset = Math.floor((scaled - inner) / 2);
  const artwork = await base
    .clone()
    .resize(scaled, scaled, { fit: "fill" })
    .extract({ left: offset, top: offset, width: inner, height: inner })
    .png()
    .toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: navy },
  })
    .composite([{ input: artwork, gravity: "centre" }])
    .png()
    .toBuffer();
}

await sharp(await square(192)).toFile("public/pwa-192.png");
await sharp(await square(512)).toFile("public/pwa-512.png");
await sharp(await maskable(192)).toFile("public/pwa-maskable-192.png");
await sharp(await maskable(512)).toFile("public/pwa-maskable-512.png");
await sharp(await square(180)).toFile("public/apple-touch-icon.png");
await sharp(await square(32)).toFile("public/favicon-32.png");

console.log(`icons ready, background rgb(${navy.r}, ${navy.g}, ${navy.b})`);
