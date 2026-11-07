import { deflateSync } from "node:zlib"
import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const BASE = 1024
const pixels = new Uint8Array(BASE * BASE * 4)

const ACCENT = [47, 111, 235]
const WHITE = [255, 255, 255]

function insideRounded(x, y, left, top, right, bottom, radius) {
  const nearestX = Math.min(Math.max(x, left + radius), right - radius)
  const nearestY = Math.min(Math.max(y, top + radius), bottom - radius)
  const dx = x - nearestX
  const dy = y - nearestY
  return dx * dx + dy * dy <= radius * radius
}

function setPixel(x, y, [red, green, blue, alpha = 255]) {
  const offset = (y * BASE + x) * 4
  pixels[offset] = red
  pixels[offset + 1] = green
  pixels[offset + 2] = blue
  pixels[offset + 3] = alpha
}

function fillRounded(left, top, right, bottom, radius, color) {
  for (let y = Math.max(0, Math.floor(top)); y < Math.min(BASE, Math.ceil(bottom)); y++) {
    for (let x = Math.max(0, Math.floor(left)); x < Math.min(BASE, Math.ceil(right)); x++) {
      if (insideRounded(x + 0.5, y + 0.5, left, top, right, bottom, radius)) setPixel(x, y, color)
    }
  }
}

fillRounded(40, 40, 984, 984, 220, ACCENT)

const PAGE = { left: 236, top: 252, right: 788, bottom: 772, radius: 64 }
for (let y = PAGE.top; y < PAGE.bottom; y++) {
  for (let x = PAGE.left; x < PAGE.right; x++) {
    if (!insideRounded(x + 0.5, y + 0.5, PAGE.left, PAGE.top, PAGE.right, PAGE.bottom, PAGE.radius)) continue
    setPixel(x, y, y < 350 ? ACCENT : WHITE)
  }
}

const dotColumns = [336, 492, 648]
const dotRows = [452, 572]
for (const dotX of dotColumns) {
  for (const dotY of dotRows) {
    fillRounded(dotX, dotY, dotX + 44, dotY + 44, 12, ACCENT)
  }
}

function downsample(source, factor) {
  const size = BASE / factor
  const output = new Uint8Array(size * size * 4)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let red = 0
      let green = 0
      let blue = 0
      let alpha = 0
      for (let sy = 0; sy < factor; sy++) {
        for (let sx = 0; sx < factor; sx++) {
          const offset = ((y * factor + sy) * BASE + (x * factor + sx)) * 4
          red += source[offset]
          green += source[offset + 1]
          blue += source[offset + 2]
          alpha += source[offset + 3]
        }
      }
      const count = factor * factor
      const target = (y * size + x) * 4
      output[target] = Math.round(red / count)
      output[target + 1] = Math.round(green / count)
      output[target + 2] = Math.round(blue / count)
      output[target + 3] = Math.round(alpha / count)
    }
  }

  return output
}

const crcTable = new Uint32Array(256)
for (let index = 0; index < 256; index++) {
  let value = index
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
  }
  crcTable[index] = value >>> 0
}

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const typeBuffer = Buffer.from(type, "ascii")
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])))
  return Buffer.concat([length, typeBuffer, data, crc])
}

function png(size, rgba) {
  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0
    Buffer.from(rgba.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ])
}

function ico(pngBuffer) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(1, 4)

  const entry = Buffer.alloc(16)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(pngBuffer.length, 8)
  entry.writeUInt32LE(22, 12)

  return Buffer.concat([header, entry, pngBuffer])
}

const buildDir = join(process.cwd(), "build")
mkdirSync(buildDir, { recursive: true })
writeFileSync(join(buildDir, "icon.png"), png(512, downsample(pixels, 2)))
writeFileSync(join(buildDir, "icon.ico"), ico(png(256, downsample(pixels, 4))))
console.log("wrote build/icon.png and build/icon.ico")
