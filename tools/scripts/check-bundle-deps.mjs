// pnpm check:bundle [app…] — mọi gói npm mà bundle `apps/<app>/dist/main.js` import (tĩnh + `import()` động) phải resolve được từ chính
// app đó (pnpm strict: phụ thuộc bắc cầu của @appchat/* không tự có trong apps/<app>/node_modules). Thiếu khai ở `dependencies` của app →
// `node dist/main.js` chết lúc khởi động hoặc lúc gọi tới — unit / integration chạy từ source không bắt được (đã lọt: qrcode, @aws-sdk/
// client-s3, prom-client). Mặc định kiểm api + worker; cần build trước (`pnpm turbo run build --filter=@appchat/api --filter=@appchat/worker`).
import { existsSync, readFileSync } from 'node:fs';
import { isBuiltin } from 'node:module';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..', '..');
const args = process.argv.slice(2);
const apps = args.filter((a) => !a.startsWith('--'));
const dirs = apps.length
  ? apps.map((a) => (a.includes('/') || a.includes('\\') ? a : join(ROOT, 'apps', a)))
  : ['api', 'worker'].map((a) => join(ROOT, 'apps', a));

/** `@scope/name/sub` → `@scope/name`; `name/sub` → `name`. */
export const packageRoot = (spec) =>
  spec
    .split('/')
    .slice(0, spec.startsWith('@') ? 2 : 1)
    .join('/');

/** Specifier gói npm trong bundle ESM (bỏ đường dẫn tương đối / tuyệt đối, `node:` và module dựng sẵn). */
export function bareImports(code) {
  const out = new Set();
  for (const m of code.matchAll(
    /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(["'])([^"'\s]+)\1/g,
  )) {
    const s = m[2];
    if (
      s.startsWith('.') ||
      s.startsWith('/') ||
      s.startsWith('node:') ||
      /^[A-Za-z]:[\\/]/.test(s) ||
      s.startsWith('data:') ||
      s.startsWith('file:')
    )
      continue;
    // Tên gói npm hợp lệ (bỏ chuỗi lạ trùng mẫu trong văn bản — vd ví dụ JSON `"from":"…"` trong mô tả action).
    if (isBuiltin(s) || !/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(\/[\w.@/-]+)?$/i.test(s)) continue;
    out.add(s);
  }
  return [...out].sort();
}

let bad = 0;
for (const dir of dirs) {
  const name = dir.split(/[\\/]/).at(-1);
  const bundle = join(dir, 'dist', 'main.js');
  if (!existsSync(bundle)) {
    process.stdout.write(`✖ ${name}: chưa có dist/main.js — build trước\n`);
    bad++;
    continue;
  }
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
  const declared = new Set(Object.keys(pkg.dependencies ?? {}));
  const missing = [];
  const roots = [...new Set(bareImports(readFileSync(bundle, 'utf8')).map(packageRoot))];
  for (const r of roots) {
    // Gói phải nằm trong node_modules của app (symlink pnpm) VÀ khai ở dependencies (devDependencies không có ở bản cài production).
    if (!declared.has(r) || !existsSync(join(dir, 'node_modules', r, 'package.json'))) missing.push(r);
  }
  if (missing.length) {
    bad++;
    process.stdout.write(
      `✖ ${name}: bundle import ${missing.length} gói chưa khai ở dependencies của app: ${missing.join(', ')}\n`,
    );
  } else process.stdout.write(`✓ ${name}: ${roots.length} gói npm trong bundle đều khai ở dependencies\n`);
}
process.exit(bad ? 1 : 0);
