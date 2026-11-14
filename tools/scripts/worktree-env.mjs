// pnpm wt:env -- --k <1..3> [--write] [--force] [--check] [--from <.env>] (TIP-035d, DC-908 a): sinh / kiểm `.env` của worktree k từ `.env`
// checkout chính — DB `_wt{k}`, cổng `5{k}xx`, Memurai `638{k}`, thư mục tuyệt đối trong worktree, pool nhỏ. Bí mật (`PG_PW_*`, key LLM /
// embed, APP_ENC_KEY…) chép nguyên, không bao giờ in thô. Mặc định chỉ in kế hoạch; `--write` mới ghi. Checkout chính không đặt biến mới.
import { execFileSync, execSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const HEADER = '# Sinh bởi tools/scripts/worktree-env.mjs (TIP-035d)';
const SECRET = /(PW|PASSWORD|SECRET|KEY|TOKEN)/;

/** Bảng cổng worktree k (§1): web 5k00, API 5k01, E2E 5k17 / 5k18 / 5k19, AI live 5k61, Memurai 638k. */
export function portsFor(k) {
  if (!Number.isInteger(k) || k < 1 || k > 3) throw new RangeError('k phải là 1..3');
  const p = (n) => 5000 + k * 100 + n;
  return { web: p(0), api: p(1), e2eWeb: p(17), e2eHttp: p(18), e2eApi: p(19), aiLive: p(61), redis: 6380 + k };
}

const parse = (text) =>
  text
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]);

const swapDb = (url, name) => {
  const u = new URL(url);
  u.pathname = `/${name}`;
  return u.toString();
};
const dbOf = (url) => decodeURIComponent(new URL(url).pathname.replace(/^\//, ''));

/** Kế hoạch env worktree k: `lines` (thứ tự ghi), `overridden` (biến đổi so với nguồn), `kept` (chép nguyên). Hàm thuần. */
export function planEnv(baseText, k, wtRoot) {
  const ports = portsFor(k);
  const id = `wt${k}`;
  const src = Object.fromEntries(parse(baseText));
  const root = resolve(wtRoot).replace(/\\/g, '/');
  const out = new Map(Object.entries(src));
  const overridden = [];
  const set = (key, value) => {
    out.set(key, String(value));
    overridden.push(key);
  };
  // Luật URL chung (§1): giá trị chứa cổng web 3000 / API 4000 của checkout chính → cổng worktree.
  for (const [key, v] of Object.entries(src)) {
    const next = v.replace(/(localhost|127\.0\.0\.1):3000\b/g, `$1:${ports.web}`).replace(/(localhost|127\.0\.0\.1):4000\b/g, `$1:${ports.api}`);
    if (next !== v) set(key, next);
  }
  const platformDb = src.PLATFORM_DATABASE_URL ? dbOf(src.PLATFORM_DATABASE_URL) : 'appchat_platform';
  if (src.PLATFORM_DATABASE_URL) set('PLATFORM_DATABASE_URL', swapDb(src.PLATFORM_DATABASE_URL, `${platformDb}_${id}`));
  // Migrator trỏ DB nền tảng của worktree (migration platform / `db:migrate-tenants` đọc registry của chính nó).
  if (src.MIGRATOR_DATABASE_URL) set('MIGRATOR_DATABASE_URL', swapDb(src.MIGRATOR_DATABASE_URL, `${platformDb}_${id}`));
  set('WORKTREE_ID', id);
  set('TENANT_TEMPLATE_DB', `appchat_tenant_template_${id}`);
  set('TEST_PLATFORM_DB', `appchat_platform_test_${id}`);
  set('TENANT_BASE_DB', `appchat_tenant_base_${id}`);
  set('REDIS_URL', `redis://127.0.0.1:${ports.redis}/0`);
  set('WEB_PORT', ports.web);
  set('API_PORT', ports.api);
  set('APP_PUBLIC_URL', `http://localhost:${ports.web}`);
  set('WIDGET_API_URL', `http://localhost:${ports.api}`);
  set('API_URL', `http://localhost:${ports.api}`);
  if (src.NEXT_PUBLIC_WS_URL !== undefined) set('NEXT_PUBLIC_WS_URL', `http://localhost:${ports.api}`);
  set('E2E_PORT', ports.e2eWeb);
  set('E2E_HTTP_PORT', ports.e2eHttp);
  set('E2E_API_PORT', ports.e2eApi);
  set('AI_LIVE_PORT', ports.aiLive);
  set('FILES_DIR', `${root}/.data/files`);
  set('ARCHIVE_DIR', `${root}/.data/archive`);
  set('MAIL_CONSOLE_DIR', `${root}/.data/mail`);
  set('TENANT_POOL_MAX', 2);
  set('TENANT_CLIENT_CACHE', 10);
  set('TENANT_CLIENT_IDLE_MS', 20000);
  set('PLATFORM_POOL_MAX', 4);
  set('PG_SLOT_COUNT', 2);
  const changed = [...new Set(overridden)];
  const lines = [...out.entries()].map(([key, v]) => `${key}=${v}`);
  const kept = Object.keys(src).filter((key) => !changed.includes(key));
  return { lines, overridden: changed, kept, values: Object.fromEntries(out) };
}

/** Che bí mật khi in: chỉ 4 ký tự cuối; URL có mật khẩu → che phần mật khẩu. */
export function mask(key, value) {
  if (/^postgres(ql)?:\/\//.test(value)) {
    const u = new URL(value);
    if (u.password) u.password = '****';
    return u.toString();
  }
  return SECRET.test(key) && value ? `****${value.slice(-4)}` : value;
}

/** Dải cổng Windows giữ (`netsh int ipv4 show excludedportrange protocol=tcp`). */
export function parseExcluded(text) {
  return [...text.matchAll(/^\s*(\d+)\s+(\d+)\s*\*?\s*$/gm)].map((m) => ({ start: Number(m[1]), end: Number(m[2]) }));
}
export const isExcluded = (port, ranges) => ranges.some((r) => port >= r.start && port <= r.end);

/** Cổng trống trên 127.0.0.1 (listen rồi đóng ngay). */
export const portFree = (port) =>
  new Promise((ok) => {
    const s = net.createServer();
    s.once('error', () => ok(false));
    s.listen(port, '127.0.0.1', () => s.close(() => ok(true)));
  });

/** Health API trả `instance` (TIP-035d) — cổng do chính worktree chạy coi như xanh. */
export async function instanceAt(port) {
  try {
    const r = await fetch(`http://127.0.0.1:${port}/v1/health`, { signal: AbortSignal.timeout(1500) });
    return r.ok ? ((await r.json())?.data?.instance ?? null) : null;
  } catch {
    return null;
  }
}

/** PID đang nghe cổng (Windows `netstat -ano`; nơi khác → null). */
export function pidOnPort(port) {
  if (process.platform !== 'win32') return null;
  try {
    const out = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    return new RegExp(`^\\s*TCP\\s+\\S+:${port}\\s+\\S+\\s+LISTENING\\s+(\\d+)`, 'm').exec(out)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Harness (e2e:http / ai-live-stack): cổng phải trống trước khi bật stack — bị chiếm thì trả thông báo (kèm PID), không chạy test vào backend lạ. */
export async function assertPortsFree(ports) {
  for (const port of ports) if (!(await portFree(Number(port)))) return `cổng ${port} đang bị chiếm (PID ${pidOnPort(port) ?? '?'}) — dừng tiến trình đó hoặc đổi cổng`;
  return null;
}

/** Instance mong đợi của stack: `WORKTREE_ID` hoặc `main`. */
export const expectedInstance = (env = process.env) => env.WORKTREE_ID || 'main';

/** PING RESP qua TCP — true khi trả `+PONG`. */
export const redisPing = (port) =>
  new Promise((ok) => {
    const s = net.connect(port, '127.0.0.1');
    const done = (v) => (s.destroy(), ok(v));
    s.setTimeout(1500, () => done(false));
    s.once('error', () => done(false));
    s.once('connect', () => s.write('*1\r\n$4\r\nPING\r\n'));
    s.once('data', (d) => done(d.toString().startsWith('+PONG')));
  });

const git = (args, cwd) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const roots = (cwd) => {
  const top = git(['rev-parse', '--show-toplevel'], cwd);
  const common = resolve(top, git(['rev-parse', '--git-common-dir'], cwd));
  const own = resolve(top, git(['rev-parse', '--git-dir'], cwd));
  return { top, main: dirname(common), isMain: common === own };
};

/** Các mục của `--check` → [{ item, ok, note }]. `deps` thay được trong test (cổng / netsh / Memurai / DB). */
export async function checkItems(k, deps) {
  const ports = portsFor(k);
  const ranges = deps.excluded ? parseExcluded(await deps.excluded()) : [];
  const rows = [];
  for (const [name, port] of Object.entries(ports).filter(([n]) => n !== 'redis')) {
    const free = await deps.portFree(port);
    const mine = !free && (await deps.instanceAt(port)) === `wt${k}`;
    rows.push({ item: `cổng ${name} ${port}`, ok: free || mine, note: free ? 'trống' : mine ? `đang chạy wt${k}` : 'bị chiếm' });
    if (isExcluded(port, ranges)) rows.push({ item: `cổng ${name} ${port} (Hyper-V)`, ok: false, note: 'nằm trong excludedportrange' });
  }
  rows.push({ item: `Memurai ${ports.redis}`, ok: await deps.redisPing(ports.redis), note: 'PING' });
  for (const [db, has] of Object.entries(await deps.databases())) rows.push({ item: `DB ${db}`, ok: has, note: has ? 'có' : 'thiếu — xem README "Tạo DB"' });
  return rows;
}

async function databases(values) {
  const names = [dbOf(values.PLATFORM_DATABASE_URL), values.TENANT_TEMPLATE_DB, values.TEST_PLATFORM_DB, values.TENANT_BASE_DB];
  const { Client } = createRequire(join(import.meta.dirname, '..', '..', 'packages', 'db', 'package.json'))('pg');
  const c = new Client({ connectionString: swapDb(values.PLATFORM_DATABASE_URL, 'postgres') });
  try {
    await c.connect();
    const have = new Set((await c.query('SELECT datname FROM pg_database WHERE datname = ANY($1)', [names])).rows.map((r) => r.datname));
    return Object.fromEntries(names.map((n) => [n, have.has(n)]));
  } catch {
    return Object.fromEntries(names.map((n) => [n, false]));
  } finally {
    await c.end().catch(() => {});
  }
}

async function main(argv) {
  const arg = (name) => {
    const i = argv.indexOf(name);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const k = Number(arg('--k'));
  if (!Number.isInteger(k) || k < 1 || k > 3) return console.error('wt:env: --k phải là 1..3'), 2;
  const r = roots(process.cwd());
  const from = arg('--from') ?? join(r.main, '.env');
  if (!existsSync(from)) return console.error(`wt:env: không thấy ${from}`), 2;
  const plan = planEnv(readFileSync(from, 'utf8'), k, r.top);
  if (argv.includes('--check')) {
    const rows = await checkItems(k, {
      portFree,
      instanceAt,
      redisPing,
      excluded: process.platform === 'win32' ? () => execSync('netsh int ipv4 show excludedportrange protocol=tcp', { encoding: 'utf8' }) : null,
      databases: () => databases(plan.values),
    });
    for (const x of rows) console.log(`${x.ok ? '✓' : '✗'} ${x.item} — ${x.note}`);
    return rows.every((x) => x.ok) ? 0 : 1;
  }
  console.log(`wt${k} ← ${from}\n đổi: ${plan.overridden.length} biến · chép nguyên: ${plan.kept.length} biến`);
  for (const key of plan.overridden) console.log(`  ${key}=${mask(key, plan.values[key])}`);
  if (!argv.includes('--write')) return console.log('(xem trước — thêm --write để ghi)'), 0;
  if (r.isMain) return console.error('wt:env: đang ở checkout chính — chỉ ghi trong worktree'), 2;
  const target = join(r.top, '.env');
  if (existsSync(target) && !readFileSync(target, 'utf8').startsWith(HEADER)) {
    if (!argv.includes('--force')) return console.error(`wt:env: ${target} không do script sinh — thêm --force (sẽ chép .env.bak-<thời điểm>)`), 2;
    copyFileSync(target, `${target}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  }
  for (const d of ['files', 'archive', 'mail', 'redis']) mkdirSync(join(r.top, '.data', d), { recursive: true });
  writeFileSync(target, `${HEADER} — wt${k} — ${new Date().toISOString()}\n${plan.lines.join('\n')}\n`);
  console.log(`đã ghi ${target}`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(await main(process.argv.slice(2)));
