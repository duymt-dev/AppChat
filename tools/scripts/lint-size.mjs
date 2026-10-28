// pnpm lint:size — chặn file vượt trần (standards/code/file-size-module-layout): FE 400, BE 600; page.tsx ≤ 120, *Screen.tsx ≤ 250.
// Allowlist rỗng và phải giữ rỗng. Không tính file sinh tự động, fixture, messages.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FE = /^(apps\/(web|widget)|packages\/ui)\//;
const BE = /^(apps\/(api|worker)|packages\/(core|ai|channels|integrations|db|actions|shared))\//;
const SKIP = [/\/node_modules\//, /\.d\.ts$/, /icons\/paths\.ts$/, /^fixtures\//, /\/messages\//, /\.json$/];

const files = execSync('git ls-files --cached --others --exclude-standard', { encoding: 'utf8' })
  .split('\n')
  .filter((f) => /\.(ts|tsx|js|mjs)$/.test(f) && fs.existsSync(f) && !SKIP.some((r) => r.test(f)));

const errors = [];
for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n').length;
  let cap = null;
  if (FE.test(f)) cap = /\/app\/.*\/page\.tsx$/.test(f) ? 120 : /Screen\.tsx$/.test(f) ? 250 : 400;
  else if (BE.test(f)) cap = 600;
  if (cap !== null && lines > cap) errors.push(`${f}: ${lines} dòng > trần ${cap}`);
}

if (errors.length) {
  console.error(`lint:size — ${errors.length} file vượt trần:\n${errors.join('\n')}`);
  process.exit(1);
}
console.log(`lint:size — ${files.length} file, không file nào vượt trần`);
