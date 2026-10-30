// Build widget nhúng (Blueprint §6: một file JS ≤ 40KB gzip): esbuild IIFE, minify, ES2019 (trình duyệt cũ của khách website).
// Kiểm cỡ gzip sau build — vượt ngân sách thì lỗi (CI chặn).
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = join(import.meta.dirname, '..');
const BUDGET = 40 * 1024;
const out = join(ROOT, 'dist', 'widget.js');
await build({
  entryPoints: [join(ROOT, 'src', 'main.ts')],
  outfile: out,
  bundle: true,
  minify: true,
  format: 'iife',
  target: 'es2019',
  platform: 'browser',
  legalComments: 'none',
  // socket.io-client: chỉ transport websocket + polling, bỏ nhánh debug.
  define: { 'process.env.NODE_ENV': '"production"' },
});
const gz = gzipSync(readFileSync(out)).length;
console.log(`widget.js — ${(gz / 1024).toFixed(1)} KB gzip (ngân sách ${BUDGET / 1024} KB)`);
if (gz > BUDGET) process.exit(1);
