// node tools/scripts/pg-slot.mjs [--wait[=<giây>]] -- <lệnh…> | --status | --role-limits [--apply] [--revert] (TIP-035d, DC-908 c, Q-913):
// semaphore slot Postgres cho lệnh nặng (integration, E2E http, ai:live, db:setup / test-reset / migrate-tenants) giữa checkout chính và các
// worktree. Khoá `pg_try_advisory_lock(NS, slot)` trên DB `postgres` (khoá advisory chỉ có hiệu lực trong MỘT database — DB nền tảng riêng
// mỗi worktree không dùng được), giữ kết nối suốt lệnh con: tiến trình chết → kết nối đóng → slot tự nhả, không kẹt.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { isAbsolute, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const NS = 735035;
export const EXIT_BUSY = 75;
const ROOT = join(import.meta.dirname, '..', '..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function envOf() {
  const f = join(process.cwd(), '.env');
  const g = join(ROOT, '.env');
  const file = existsSync(f) ? f : existsSync(g) ? g : null;
  const parsed = file ? Object.fromEntries(readFileSync(file, 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])) : {};
  return { ...parsed, ...process.env };
}

/** URL tới DB `postgres` (cùng host / role với DB nền tảng) — nơi giữ khoá slot chung của mọi worktree. */
export function slotUrl(env = envOf()) {
  const base = env.PLATFORM_DATABASE_URL;
  if (!base) return null;
  const u = new URL(base);
  u.pathname = '/postgres';
  return u.toString();
}

const pgClient = () => createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg').Client;
const bypass = (env) => env.PG_SLOT_HELD !== undefined || env.PG_SLOT_DISABLE === '1' || env.CI === 'true';

/**
 * Lấy một slot (0..count−1) rồi chạy `fn`; nhả khi `fn` xong / lỗi. `wait` giây (0 = không chờ → ném `busy`). Lồng (`PG_SLOT_HELD` đã có),
 * `PG_SLOT_DISABLE=1` / `CI=true`, hoặc không nối được Postgres → chạy thẳng (cảnh báo một dòng ở trường hợp cuối).
 */
export async function withSlot(fn, opts = {}) {
  const env = opts.env ?? envOf();
  if (bypass(env)) return fn(env.PG_SLOT_HELD ?? null);
  const url = opts.url ?? slotUrl(env);
  const count = Math.max(1, Number(opts.count ?? env.PG_SLOT_COUNT ?? 2));
  const label = `appchat-pg-slot:${env.WORKTREE_ID || 'main'}:${String(opts.label ?? '').slice(0, 40)}`;
  const Client = pgClient();
  const c = url ? new Client({ connectionString: url, application_name: label.slice(0, 63) }) : null;
  try {
    if (!c) throw new Error('thiếu PLATFORM_DATABASE_URL');
    await c.connect();
  } catch (e) {
    (opts.log ?? console.warn)(`pg-slot: không nối được Postgres (${e.message}) — chạy không giữ slot`);
    await c?.end().catch(() => {});
    return fn(null);
  }
  try {
    const deadline = Date.now() + (opts.wait ?? 0) * 1000;
    let slot = null;
    let said = 0;
    for (;;) {
      for (let i = 0; i < count && slot === null; i++) if ((await c.query('SELECT pg_try_advisory_lock($1, $2) AS ok', [NS, i])).rows[0].ok) slot = i;
      if (slot !== null) break;
      if (Date.now() >= deadline) throw Object.assign(new Error('hết slot Postgres'), { code: 'busy' });
      if (Date.now() - said >= 30_000) {
        said = Date.now();
        (opts.log ?? console.log)(`pg-slot: đang chờ slot — đang giữ: ${(await holders(c)).map((h) => h.app).join(', ') || '?'}`);
      }
      await sleep(opts.pollMs ?? 2000);
    }
    const prev = process.env.PG_SLOT_HELD;
    process.env.PG_SLOT_HELD = String(slot);
    try {
      return await fn(slot);
    } finally {
      if (prev === undefined) delete process.env.PG_SLOT_HELD;
      else process.env.PG_SLOT_HELD = prev;
    }
  } finally {
    await c.end().catch(() => {});
  }
}

/** Ai đang giữ slot (pg_locks advisory NS + application_name). */
export async function holders(c) {
  const r = await c.query(
    `SELECT l.objid::int AS slot, a.application_name AS app, a.pid, now() - a.backend_start AS age
     FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
     WHERE l.locktype = 'advisory' AND l.classid = $1::int AND l.granted ORDER BY 1`,
    [NS],
  );
  return r.rows;
}

/** Lệnh con: đường dẫn tuyệt đối (node.exe…) chạy thẳng; tên lệnh (tsx / vitest — shim .cmd trên Windows) chạy qua shell, một chuỗi đã quote. */
export function childSpec(cmd) {
  if (isAbsolute(cmd[0])) return { file: cmd[0], args: cmd.slice(1), shell: false };
  const q = (a) => (/^[\w@%+=:,./\-]+$/.test(a) ? a : `"${a.replace(/"/g, '\\"')}"`);
  return { file: cmd.map(q).join(' '), args: [], shell: true };
}

const ROLE_LIMITS = [
  ['appchat_tenant_app', 45],
  ['appchat_platform_app', 20],
];

async function main(argv) {
  const env = envOf();
  if (argv.includes('--status')) {
    const Client = pgClient();
    const c = new Client({ connectionString: slotUrl(env) });
    try {
      await c.connect();
      const rows = await holders(c);
      console.log(`slot Postgres (NS ${NS}, ${env.PG_SLOT_COUNT ?? 2} slot): ${rows.length ? '' : 'trống'}`);
      for (const r of rows) console.log(`  slot ${r.slot} — ${r.app} (pid ${r.pid})`);
      return 0;
    } finally {
      await c.end().catch(() => {});
    }
  }
  if (argv.includes('--role-limits')) {
    const sql = ROLE_LIMITS.map(([role, n]) => `ALTER ROLE ${role} CONNECTION LIMIT ${argv.includes('--revert') ? -1 : n};`);
    if (!argv.includes('--apply')) return console.log(`-- Q-913 (chỉ in; superuser tự chạy hoặc thêm --apply):\n${sql.join('\n')}`), 0;
    const admin = existsSync(join(ROOT, '.env.local-admin')) ? /^PG_ADMIN_URL=(.*)$/m.exec(readFileSync(join(ROOT, '.env.local-admin'), 'utf8'))?.[1] : env.PG_ADMIN_URL;
    if (!admin) return console.error('pg-slot: --apply cần PG_ADMIN_URL (.env.local-admin)'), 2;
    const c = new (pgClient())({ connectionString: admin });
    try {
      await c.connect();
      for (const s of sql) await c.query(s);
      console.log(`đã chạy:\n${sql.join('\n')}`);
      return 0;
    } finally {
      await c.end().catch(() => {});
    }
  }
  const sep = argv.indexOf('--');
  const cmd = sep >= 0 ? argv.slice(sep + 1) : [];
  if (!cmd.length) return console.error('dùng: pg-slot [--wait[=giây]] -- <lệnh…> | --status | --role-limits [--apply] [--revert]'), 2;
  const w = argv.slice(0, sep).find((a) => a.startsWith('--wait'));
  const wait = w ? (w.includes('=') ? Number(w.split('=')[1]) : 1800) : 0;
  try {
    return await withSlot(
      (slot) =>
        new Promise((ok) => {
          const spec = childSpec(cmd);
          const child = spawn(spec.file, spec.args, { stdio: 'inherit', shell: spec.shell, env: { ...process.env, ...(slot !== null ? { PG_SLOT_HELD: String(slot) } : {}) } });
          const fwd = (sig) => child.kill(sig);
          process.on('SIGINT', fwd);
          process.on('SIGTERM', fwd);
          child.on('exit', (code, sig) => {
            process.off('SIGINT', fwd);
            process.off('SIGTERM', fwd);
            ok(code ?? (sig ? 1 : 0));
          });
        }),
      { env, wait, label: cmd.join(' ') },
    );
  } catch (e) {
    if (e.code === 'busy') return console.error(`pg-slot: hết slot (${env.PG_SLOT_COUNT ?? 2}) — thêm --wait để xếp hàng`), EXIT_BUSY;
    throw e;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
