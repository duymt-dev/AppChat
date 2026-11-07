// pnpm e2e [module…] | --changed — chạy apps/web/e2e/<module>.spec.ts ở desktop + mobile-390 (D39: chỉ phần bị ảnh hưởng).
// Chạy từ apps/web (pnpm --filter @appchat/web run e2e).
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
let specs = args.filter((a) => !a.startsWith('--')).map((m) => `e2e/${m}.spec.ts`);

if (args.includes('--changed')) {
  const root = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim();
  const files = execSync('git diff --name-only origin/dev...HEAD', { cwd: root, encoding: 'utf8' }).split('\n');
  const shared = files.some((f) => /^(packages\/(ui|shared|actions)|apps\/web\/src\/(shared|app\/layout|i18n))/.test(f));
  if (shared) specs = []; // lớp dùng chung đổi → chạy mọi spec
  else {
    const mods = new Set(
      files.map((f) => f.match(/^apps\/web\/(?:src\/features\/([^/]+)\/|e2e\/([^/.]+)\.spec\.ts)/)?.slice(1).find(Boolean)).filter(Boolean),
    );
    specs = [...mods].map((m) => `e2e/${m}.spec.ts`).filter((s) => fs.existsSync(s));
    if (!specs.length) {
      console.log('e2e --changed: không có spec bị ảnh hưởng');
      process.exit(0);
    }
  }
}

const r = spawnSync('pnpm', ['exec', 'playwright', 'test', ...specs], { stdio: 'inherit', shell: true });
process.exit(r.status ?? 1);
