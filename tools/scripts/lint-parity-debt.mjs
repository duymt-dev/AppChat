// pnpm lint:parity-debt — sổ nợ parity (DC-360, tools/parity/parity-debt.json) chỉ được rút ngắn: so với origin/dev, không thêm màn,
// không nâng trần; mọi màn trong sổ phải có trong manifest; trần ≤ 0,08 (nợ lớn hơn phải sửa ngay, không ghi sổ). Chạy ở CI cùng lint:masks.
import { execSync } from 'node:child_process';
import fs from 'node:fs';

const FILE = 'tools/parity/parity-debt.json';
const BASE = process.env.PARITY_DEBT_BASE ?? 'origin/dev';
const MAX_CEILING = 0.08;

const now = JSON.parse(fs.readFileSync(FILE, 'utf8')).screens;
let before = null;
try {
  before = JSON.parse(
    execSync(`git show ${BASE}:${FILE}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
  ).screens;
} catch {
  // Sổ chưa có ở nhánh nền (PR tạo sổ) → chỉ kiểm hình thức.
}
// Id khai ở parity.manifest.ts hoặc modules/*.ts (drawer('quotes:ai', …) / id: '…').
const ids = new Set(
  [
    'tools/parity/parity.manifest.ts',
    ...fs.readdirSync('tools/parity/modules').map((f) => `tools/parity/modules/${f}`),
  ].flatMap((f) =>
    [...fs.readFileSync(f, 'utf8').matchAll(/(?:id:\s*|drawer\(\s*)'([a-z0-9-]+:[a-z0-9:-]+)'/g)].map(
      (m) => m[1],
    ),
  ),
);
const errors = [];
for (const [id, d] of Object.entries(now)) {
  if (!ids.has(id)) errors.push(`${id}: không có trong parity manifest`);
  if (!(typeof d.ceiling === 'number' && d.ceiling > 0.05 && d.ceiling <= MAX_CEILING))
    errors.push(`${id}: trần phải trong (0,05; ${MAX_CEILING}]`);
  if (!d.owner || !d.note) errors.push(`${id}: thiếu owner / note`);
  if (before) {
    if (!before[id]) errors.push(`${id}: màn mới vào sổ nợ — sổ chỉ được rút ngắn (DC-360); sửa màn về ≤ 5%`);
    else if (d.ceiling > before[id].ceiling)
      errors.push(`${id}: nâng trần ${before[id].ceiling} → ${d.ceiling} — chỉ được hạ`);
  }
}
if (errors.length) {
  for (const e of errors) process.stdout.write(`✖ ${e}\n`);
  process.exit(1);
}
const paid = before ? Object.keys(before).filter((id) => !now[id]) : [];
process.stdout.write(
  `lint:parity-debt — ${Object.keys(now).length} màn nợ${paid.length ? `, trả xong: ${paid.join(', ')}` : ''}\n`,
);
