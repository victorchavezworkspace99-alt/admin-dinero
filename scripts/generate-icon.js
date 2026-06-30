const fs = require('fs');
const zlib = require('zlib');

const SIZE = 1024;
const BG = [0x1A, 0x6D, 0xF0];
const FG = [0xFF, 0xFF, 0xFF];

function setPixel(data, x, y, r, g, b, a) {
  const idx = (y * SIZE + x) * 4;
  data[idx] = r; data[idx+1] = g; data[idx+2] = b; data[idx+3] = a;
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1-x2)**2 + (y1-y2)**2);
}

function generateIcon() {
  const raw = Buffer.alloc(SIZE * SIZE * 4, 0);
  const cx = SIZE / 2, cy = SIZE / 2, radius = SIZE * 0.88 / 2;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = dist(x, y, cx, cy);
      if (d <= radius) {
        setPixel(raw, x, y, BG[0], BG[1], BG[2], 255);
      }
    }
  }

  const fSize = SIZE * 0.55;
  const bx = cx - fSize * 0.3, by = cy - fSize * 0.48;
  const bw = fSize * 0.6, bh = fSize * 0.96;
  const barW = fSize * 0.18;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (dist(x, y, cx, cy) > radius) continue;
      const inVertBar = x >= bx && x <= bx + barW && y >= by && y <= by + bh;
      const inHorizBar1 = x >= bx && x <= bx + bw && y >= by + bh * 0.15 && y <= by + bh * 0.38;
      const inHorizBar2 = x >= bx && x <= bx + bw && y >= by + bh * 0.58 && y <= by + bh * 0.78;
      if (inVertBar || inHorizBar1 || inHorizBar2) {
        setPixel(raw, x, y, FG[0], FG[1], FG[2], 255);
      }
    }
  }

  const minRad = radius * 0.92;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = dist(x, y, cx, cy);
      if (d > minRad && d <= radius) {
        const alpha = Math.round(((radius - d) / (radius - minRad)) * 255);
        const bgIdx = (y * SIZE + x) * 4;
        raw[bgIdx+3] = alpha;
      }
    }
  }

  const rows = [];
  for (let y = 0; y < SIZE; y++) {
    const row = Buffer.alloc(1 + SIZE * 4);
    row[0] = 0;
    for (let x = 0; x < SIZE; x++) {
      const idx = (y * SIZE + x) * 4;
      row[1 + x*4] = raw[idx];
      row[1 + x*4 + 1] = raw[idx+1];
      row[1 + x*4 + 2] = raw[idx+2];
      row[1 + x*4 + 3] = raw[idx+3];
    }
    rows.push(row);
  }

  const rawData = Buffer.concat(rows);
  const deflated = zlib.deflateSync(rawData);
  const crc32 = (buf) => {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      c = (c ^ buf[i]) >>> 0;
      for (let j = 0; j < 8; j++) c = (c >>> 1) ^ (c & 1 ? 0xEDB88320 : 0);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
  };
  const toBE32 = (v) => {
    const b = Buffer.alloc(4);
    b.writeUInt32BE(v >>> 0, 0);
    return b;
  };

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.concat([
    toBE32(13),
    Buffer.from('IHDR'),
    toBE32(SIZE), toBE32(SIZE),
    Buffer.from([8, 6, 0, 0, 0]),
  ]);
  const ihdr = Buffer.concat([ihdrData, toBE32(crc32(ihdrData.slice(4)))]);

  const idatData = Buffer.concat([
    toBE32(deflated.length),
    Buffer.from('IDAT'),
    deflated,
  ]);
  const idat = Buffer.concat([idatData, toBE32(crc32(idatData.slice(4)))]);

  const iendData = Buffer.concat([
    toBE32(0),
    Buffer.from('IEND'),
  ]);
  const iend = Buffer.concat([iendData, toBE32(crc32(iendData.slice(4)))]);

  const png = Buffer.concat([signature, ihdr, idat, iend]);

  fs.mkdirSync('assets', { recursive: true });
  fs.writeFileSync('assets/icon.png', png);
  fs.writeFileSync('assets/adaptive-icon.png', png);
  console.log(`Icono generado: ${png.length} bytes`);
}

generateIcon();
