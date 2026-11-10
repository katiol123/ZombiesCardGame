#!/usr/bin/env node
/*
 * Сборка игры в ZIP для публикации на игровых площадках.
 * Запуск:  node tools/build-zip.js   →   dist/last-stand.zip
 *
 * В архив попадают только файлы игры: index.html (в корне архива), css/, js/, assets/.
 * Служебное не попадает: docs/, tools/, README и .md-файлы, .git, dist/.
 * Внешних зависимостей нет — нужен только Node.js.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const ROOT = path.join(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT = path.join(OUT_DIR, 'last-stand.zip');
const INCLUDE = ['index.html', 'css', 'js', 'assets'];
const SKIP = (rel) => /\.md$/i.test(rel) || /(^|\/)\./.test(rel); // .md и скрытые файлы

function walk(rel, out) {
  const abs = path.join(ROOT, rel);
  const st = fs.statSync(abs);
  if (st.isDirectory()) fs.readdirSync(abs).sort().forEach((n) => walk(rel + '/' + n, out));
  else if (!SKIP(rel)) out.push(rel);
  return out;
}

// CRC-32 для заголовков ZIP
const CRC = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = (buf) => { let c = 0xffffffff; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

function dosTime(d) {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}

function build() {
  const files = INCLUDE.flatMap((r) => (fs.existsSync(path.join(ROOT, r)) ? walk(r, []) : []));
  if (!files.includes('index.html')) throw new Error('Нет index.html в корне проекта');
  const parts = [];
  const central = [];
  let offset = 0;
  const { time, date } = dosTime(new Date());
  for (const rel of files) {
    const data = fs.readFileSync(path.join(ROOT, rel));
    const name = Buffer.from(rel, 'utf8');
    // уже сжатые форматы (картинки, звук, шрифты) кладём без сжатия — так быстрее и не больше
    const stored = /\.(webp|png|jpe?g|gif|mp3|ogg|woff2?)$/i.test(rel);
    const body = stored ? data : zlib.deflateRawSync(data, { level: 9 });
    const method = stored ? 0 : 8;
    const crc = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(0x0800, 6); // UTF-8 имена
    local.writeUInt16LE(method, 8); local.writeUInt16LE(time, 10); local.writeUInt16LE(date, 12);
    local.writeUInt32LE(crc, 14); local.writeUInt32LE(body.length, 18); local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26); local.writeUInt16LE(0, 28);
    parts.push(local, name, body);
    const cen = Buffer.alloc(46);
    cen.writeUInt32LE(0x02014b50, 0); cen.writeUInt16LE(20, 4); cen.writeUInt16LE(20, 6); cen.writeUInt16LE(0x0800, 8);
    cen.writeUInt16LE(method, 10); cen.writeUInt16LE(time, 12); cen.writeUInt16LE(date, 14);
    cen.writeUInt32LE(crc, 16); cen.writeUInt32LE(body.length, 20); cen.writeUInt32LE(data.length, 24);
    cen.writeUInt16LE(name.length, 28); cen.writeUInt32LE(offset, 42);
    central.push(cen, name);
    offset += local.length + name.length + body.length;
  }
  const cenBuf = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(cenBuf.length, 12); end.writeUInt32LE(offset, 16);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT, Buffer.concat([...parts, cenBuf, end]));
  const mb = (fs.statSync(OUT).size / 1048576).toFixed(1);
  console.log(`Готово: ${path.relative(ROOT, OUT)} — ${files.length} файлов, ${mb} МБ. index.html в корне архива.`);
}

build();
