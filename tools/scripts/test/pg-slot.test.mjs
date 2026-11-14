// TIP-035d AC6–7 (Postgres thật — `.env` máy dev): tối đa PG_SLOT_COUNT lệnh cùng giữ slot, lệnh thứ 3 chờ (`--wait`) rồi chạy; không
// `--wait` → mã 75; lệnh con thoát mã 3 → pg-slot trả 3, slot nhả; kill tiến trình giữ slot → slot nhả; lồng `PG_SLOT_HELD` không tự khoá;
// hai tiến trình với DB nền tảng khác nhau (`_wt1`, `_wt2`) tranh CÙNG bộ slot (khoá ở DB `postgres`); `--status` thấy application_name.
// Không có Postgres → skip có lý do (không tính pass). Dùng PG_SLOT_COUNT riêng (NS chung) nhưng chỉ khi không ai khác đang giữ slot.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { describe, it, before } from 'node:test';
import { NS, slotUrl } from '../pg-slot.mjs';

const ROOT = join(import.meta.dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'tools', 'scripts', 'pg-slot.mjs');
const dotenv = existsSync(join(ROOT, '.env')) ? Object.fromEntries(readFileSync(join(ROOT, '.env'), 'utf8').split(/\r?\n/).filter((l) => /^[A-Z_][A-Z0-9_]*=/.test(l)).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])) : {};
const { Client } = createRequire(join(ROOT, 'packages', 'db', 'package.json'))('pg');
const swap = (u, db) => Object.assign(new URL(u), { pathname: `/${db}` }).toString();
const baseEnv = (o = {}) => {
  const e = { ...process.env, ...dotenv, PG_SLOT_COUNT: '2', ...o };
  delete e.PG_SLOT_HELD;
  delete e.PG_SLOT_DISABLE;
  delete e.CI;
  return e;
};

let skip = 'chưa kiểm';
before(async () => {
  if (!dotenv.PLATFORM_DATABASE_URL) return void (skip = 'không có .env / PLATFORM_DATABASE_URL');
  const c = new Client({ connectionString: slotUrl(dotenv) });
  try {
    await c.connect();
    const held = (await c.query(`SELECT count(*)::int n FROM pg_locks WHERE locktype = 'advisory' AND classid = $1::int AND granted`, [NS])).rows[0].n;
    skip = held ? `đang có ${held} slot bị giữ bởi lệnh khác — không đo được chính xác` : '';
  } catch (e) {
    skip = `không nối được Postgres: ${e.message}`;
  } finally {
    await c.end().catch(() => {});
  }
});

/** Chạy pg-slot với lệnh con node in mốc bắt đầu / kết thúc. */
function slotted(args, childJs, env = baseEnv()) {
  const p = spawn(process.execPath, [SCRIPT, ...args, '--', process.execPath, '-e', childJs], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  let out = '';
  p.stdout.on('data', (d) => (out += d));
  p.stderr.on('data', (d) => (out += d));
  const done = new Promise((ok) => p.on('exit', (code) => ok({ code, out })));
  return { p, done };
}
const hold = (ms, tag) => `console.log('start ${tag} ' + Date.now() + ' slot=' + process.env.PG_SLOT_HELD); setTimeout(() => console.log('end ${tag} ' + Date.now()), ${ms})`;
const at = (out, kind, tag) => Number(new RegExp(`${kind} ${tag} (\\d+)`).exec(out)?.[1]);

describe('pg-slot (Postgres thật)', () => {
  it('AC6: tối đa 2 cùng lúc, lệnh thứ 3 chờ rồi chạy; không --wait → 75', async (t) => {
    if (skip) return t.skip(skip);
    const a = slotted(['--wait'], hold(4000, 'A'));
    const b = slotted(['--wait'], hold(4000, 'B'));
    await new Promise((r) => setTimeout(r, 1500));
    const busy = slotted([], hold(10, 'X'));
    const c = slotted(['--wait'], hold(500, 'C'));
    const [ra, rb, rx, rc] = await Promise.all([a.done, b.done, busy.done, c.done]);
    assert.equal(rx.code, 75, rx.out);
    assert.deepEqual([ra.code, rb.code, rc.code], [0, 0, 0]);
    const firstEnd = Math.min(at(ra.out, 'end', 'A'), at(rb.out, 'end', 'B'));
    assert.ok(at(rc.out, 'start', 'C') >= firstEnd, `C bắt đầu ${at(rc.out, 'start', 'C')} trước khi A/B kết thúc ${firstEnd}`);
    assert.match(ra.out + rb.out, /slot=0/);
    assert.match(ra.out + rb.out, /slot=1/);
  });

  it('AC6: lệnh con thoát mã 3 → pg-slot trả 3 và slot nhả; kill tiến trình giữ slot → slot nhả', async (t) => {
    if (skip) return t.skip(skip);
    assert.equal((await slotted([], 'process.exit(3)').done).code, 3);
    const victim = slotted(['--wait'], hold(60_000, 'V'));
    await new Promise((r) => setTimeout(r, 1500));
    victim.p.kill('SIGKILL');
    await victim.done;
    const a = slotted([], hold(10, 'A'));
    const b = slotted([], hold(10, 'B'));
    assert.deepEqual([(await a.done).code, (await b.done).code], [0, 0]);
  });

  it('AC6: lồng PG_SLOT_HELD → chạy thẳng, không lấy slot thứ hai (không tự khoá khi đã hết slot)', async (t) => {
    if (skip) return t.skip(skip);
    const nested = `require('child_process').spawnSync(process.execPath, [${JSON.stringify(SCRIPT)}, '--', process.execPath, '-e', 'process.exit(7)'], { stdio: 'inherit' }).status === 7 ? process.exit(0) : process.exit(1)`;
    const a = slotted(['--wait'], hold(3000, 'A'));
    await new Promise((r) => setTimeout(r, 800));
    const outer = await slotted(['--wait'], nested).done;
    assert.equal(outer.code, 0, outer.out);
    await a.done;
  });

  it('AC7: hai DB nền tảng khác nhau (_wt1, _wt2) tranh cùng bộ slot; --status thấy application_name đúng worktree', async (t) => {
    if (skip) return t.skip(skip);
    const e1 = baseEnv({ WORKTREE_ID: 'wt1', PLATFORM_DATABASE_URL: swap(dotenv.PLATFORM_DATABASE_URL, 'appchat_platform_wt1') });
    const e2 = baseEnv({ WORKTREE_ID: 'wt2', PLATFORM_DATABASE_URL: swap(dotenv.PLATFORM_DATABASE_URL, 'appchat_platform_wt2') });
    const a = slotted(['--wait'], hold(4000, 'A'), e1);
    const b = slotted(['--wait'], hold(4000, 'B'), e2);
    await new Promise((r) => setTimeout(r, 1500));
    const st = spawn(process.execPath, [SCRIPT, '--status'], { env: baseEnv() });
    let status = '';
    st.stdout.on('data', (d) => (status += d));
    await new Promise((ok) => st.on('exit', ok));
    const third = await slotted([], hold(10, 'X'), e1).done;
    assert.equal(third.code, 75);
    assert.match(status, /appchat-pg-slot:wt1:/);
    assert.match(status, /appchat-pg-slot:wt2:/);
    await Promise.all([a.done, b.done]);
  });
});
