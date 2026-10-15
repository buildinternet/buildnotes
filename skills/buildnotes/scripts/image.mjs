// image.mjs: an image's size from its header, and a file as a data URI. Shared by motion.mjs and brand.mjs.

// Width and height of a PNG, JPEG, GIF or WebP, from its header.
export function imageSize(buf) {
  if (buf.readUInt32BE(0) === 0x89504e47) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  if (buf.toString("ascii", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)];
  if (buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") {
    const chunk = buf.toString("ascii", 12, 16);
    if (chunk === "VP8X") return [1 + buf.readUIntLE(24, 3), 1 + buf.readUIntLE(27, 3)];
    if (chunk === "VP8L") { const b = buf.readUInt32LE(21); return [(b & 0x3fff) + 1, ((b >> 14) & 0x3fff) + 1]; }
    if (chunk === "VP8 ") return [buf.readUInt16LE(26) & 0x3fff, buf.readUInt16LE(28) & 0x3fff];
  }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    for (let i = 2; i < buf.length - 9;) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Width and height of an SVG, from its viewBox or its width and height.
export function svgSize(text) {
  const tag = text.match(/<svg\b[^>]*>/)?.[0];
  if (!tag) return null;
  const vb = tag.match(/\bviewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)\s*"/);
  if (vb) return [Number(vb[1]), Number(vb[2])];
  const w = parseFloat(tag.match(/\bwidth="([\d.]+)(px)?"/)?.[1]), h = parseFloat(tag.match(/\bheight="([\d.]+)(px)?"/)?.[1]);
  return w > 0 && h > 0 ? [w, h] : null;
}

export const dataUri = (buf, type) => `data:${type};base64,${buf.toString("base64")}`;
