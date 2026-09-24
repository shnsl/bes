import { readFileSync } from "node:fs";
import sharp from "sharp";

const source = sharp(readFileSync("assets/icon-source.jpg")).rotate().ensureAlpha();
const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

function isBackground(i) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  return r > 230 && g > 230 && b > 230;
}

let minX = width;
let minY = height;
let maxX = 0;
let maxY = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * channels;
    if (isBackground(i)) continue;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
}

const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.02);
minX = Math.max(0, minX - pad);
minY = Math.max(0, minY - pad);
maxX = Math.min(width - 1, maxX + pad);
maxY = Math.min(height - 1, maxY + pad);
const cropW = maxX - minX + 1;
const cropH = maxY - minY + 1;
const side = Math.max(cropW, cropH);
const left = Math.max(0, minX - Math.floor((side - cropW) / 2));
const top = Math.max(0, minY - Math.floor((side - cropH) / 2));
const extractW = Math.min(side, width - left);
const extractH = Math.min(side, height - top);

const emblemRaw = await sharp(readFileSync("assets/icon-source.jpg"))
  .rotate()
  .extract({ left, top, width: extractW, height: extractH })
  .resize(1024, 1024, { fit: "cover" })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < emblemRaw.data.length; i += emblemRaw.info.channels) {
  const r = emblemRaw.data[i];
  const g = emblemRaw.data[i + 1];
  const b = emblemRaw.data[i + 2];
  if (r > 230 && g > 230 && b > 230) emblemRaw.data[i + 3] = 0;
}

const emblem = sharp(emblemRaw.data, {
  raw: {
    width: emblemRaw.info.width,
    height: emblemRaw.info.height,
    channels: emblemRaw.info.channels,
  },
});

const cx = Math.floor(emblemRaw.info.width * 0.5);
const cy = Math.floor(emblemRaw.info.height * 0.28);
const si = (cy * emblemRaw.info.width + cx) * emblemRaw.info.channels;
const navy = {
  r: emblemRaw.data[si],
  g: emblemRaw.data[si + 1],
  b: emblemRaw.data[si + 2],
  alpha: 1,
};

async function compose(size, fillRatio) {
  const artSize = Math.round(size * fillRatio);
  const artwork = await emblem.clone().resize(artSize, artSize, { fit: "cover" }).png().toBuffer();
  return sharp({
    create: { width: size, height: size, channels: 4, background: navy },
  })
    .composite([{ input: artwork, gravity: "centre" }])
    .png()
    .toBuffer();
}

await sharp(await compose(192, 0.94)).toFile("public/pwa-192.png");
await sharp(await compose(512, 0.94)).toFile("public/pwa-512.png");
await sharp(await compose(192, 0.72)).toFile("public/pwa-maskable-192.png");
await sharp(await compose(512, 0.72)).toFile("public/pwa-maskable-512.png");
await sharp(await compose(180, 0.94)).toFile("public/apple-touch-icon.png");
await sharp(await compose(32, 0.94)).toFile("public/favicon-32.png");

console.log(
  `icons ready crop=${extractW}x${extractH} bg=rgb(${navy.r},${navy.g},${navy.b})`,
);
