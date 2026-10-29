// D41: chặn cỡ chữ / bo góc / spacing lẻ viết thẳng trong style của apps/web (phải qua thang token).
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../../apps/web/src');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(ROOT).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
const bad = [];
for (const f of files) {
  fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
    if (/font-size:\s*\d/.test(line)) bad.push(`${f}:${i + 1} font-size phải dùng font.size / font.scale`);
    if (/border-radius:\s*\d+(\.\d+)?px/.test(line)) bad.push(`${f}:${i + 1} border-radius phải dùng radius.*`);
    const sp = line.match(/^\s*(?:padding|margin|gap)[a-z-]*:\s*([^;$]+);/);
    if (sp) for (const m of sp[1].matchAll(/(\d+(?:\.\d+)?)px/g)) {
      const v = Number(m[1]);
      if (v > 8 ? v % 4 !== 0 : ![0, 2, 4, 6, 8].includes(v)) bad.push(`${f}:${i + 1} spacing ${v}px ngoài lưới 4`);
    }
  });
}
if (bad.length) {
  console.error(bad.join('\n'));
  process.exit(1);
}
console.log(`lint:tokens — ${files.length} file, đúng thang D41`);
