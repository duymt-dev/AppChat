// TIP-035d AC2–3: bảng env worktree (planEnv k = 1..3), bí mật giữ nguyên + che khi in, từ chối k sai / checkout chính / `.env` lạ; `--check`
// cổng bị chiếm (server giả), cổng nằm trong dải netsh, cổng do chính worktree chạy (health `instance = wt1`) không tính đỏ.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { checkItems, isExcluded, mask, parseExcluded, planEnv, portFree, portsFor } from '../worktree-env.mjs';

const SCRIPT = join(import.meta.dirname, '..', 'worktree-env.mjs');
const BASE = [
  'PG_PW_PLATFORM_APP=pw-platform-secret-AAAA',
  'PG_PW_TENANT_APP=pw-tenant-secret-BBBB',
  'PLATFORM_DATABASE_URL=postgresql://appchat_platform_app:pw-platform-secret-AAAA@localhost:5432/appchat_platform',
  'TENANT_DATABASE_URL=postgresql://appchat_tenant_app:pw-tenant-secret-BBBB@localhost:5432/postgres',
  'MIGRATOR_DATABASE_URL=postgresql://appchat_migrator:pw-m@localhost:5432/appchat_platform',
  'TENANT_TEMPLATE_DB=appchat_tenant_template',
  'REDIS_URL=redis://127.0.0.1:6379/0',
  'APP_ENC_KEY=enc-key-1234567890-WXYZ',
  'LLM_SEED_API_KEY=sk-llm-0000-LLMK',
  'EMBED_SEED_API_KEY=sk-embed-0000-EMBK',
  'APP_PUBLIC_URL=http://localhost:3117',
  'HOOKS_PUBLIC_URL=http://localhost:4000/hooks',
  'API_URL=http://localhost:4000',
  'NEXT_PUBLIC_WS_URL=http://localhost:4000',
  'API_PORT=4000',
].join('\n');

describe('portsFor / planEnv (§1)', () => {
  it('k = 2: cổng 5200 / 5201 / 5217 / 5218 / 5219 / 5261, Memurai 6382; k ngoài 1..3 ném lỗi', () => {
    assert.deepEqual(portsFor(2), { web: 5200, api: 5201, e2eWeb: 5217, e2eHttp: 5218, e2eApi: 5219, aiLive: 5261, redis: 6382 });
    assert.throws(() => portsFor(0), RangeError);
    assert.throws(() => portsFor(4), RangeError);
  });

  it('k = 2: DB _wt2, Redis 6382, URL / cổng / thư mục tuyệt đối; bí mật + key LLM / embed chép nguyên; luật URL 4000 → 5201', () => {
    const { values: v, overridden, kept } = planEnv(BASE, 2, 'D:\\CODING\\wt2');
    assert.equal(v.WORKTREE_ID, 'wt2');
    assert.match(v.PLATFORM_DATABASE_URL, /@localhost:5432\/appchat_platform_wt2$/);
    assert.match(v.PLATFORM_DATABASE_URL, /pw-platform-secret-AAAA/);
    assert.match(v.MIGRATOR_DATABASE_URL, /\/appchat_platform_wt2$/);
    assert.equal(v.TENANT_DATABASE_URL, 'postgresql://appchat_tenant_app:pw-tenant-secret-BBBB@localhost:5432/postgres');
    assert.equal(v.TENANT_TEMPLATE_DB, 'appchat_tenant_template_wt2');
    assert.equal(v.TEST_PLATFORM_DB, 'appchat_platform_test_wt2');
    assert.equal(v.TENANT_BASE_DB, 'appchat_tenant_base_wt2');
    assert.equal(v.REDIS_URL, 'redis://127.0.0.1:6382/0');
    assert.deepEqual([v.WEB_PORT, v.API_PORT, v.E2E_PORT, v.E2E_HTTP_PORT, v.E2E_API_PORT, v.AI_LIVE_PORT], ['5200', '5201', '5217', '5218', '5219', '5261']);
    assert.equal(v.APP_PUBLIC_URL, 'http://localhost:5200');
    assert.equal(v.WIDGET_API_URL, 'http://localhost:5201');
    assert.equal(v.HOOKS_PUBLIC_URL, 'http://localhost:5201/hooks');
    assert.equal(v.NEXT_PUBLIC_WS_URL, 'http://localhost:5201');
    assert.deepEqual([v.FILES_DIR, v.ARCHIVE_DIR, v.MAIL_CONSOLE_DIR], ['D:/CODING/wt2/.data/files', 'D:/CODING/wt2/.data/archive', 'D:/CODING/wt2/.data/mail']);
    assert.deepEqual([v.TENANT_POOL_MAX, v.TENANT_CLIENT_CACHE, v.TENANT_CLIENT_IDLE_MS, v.PLATFORM_POOL_MAX, v.PG_SLOT_COUNT], ['2', '10', '20000', '4', '2']);
    for (const k of ['PG_PW_PLATFORM_APP', 'PG_PW_TENANT_APP', 'APP_ENC_KEY', 'LLM_SEED_API_KEY', 'EMBED_SEED_API_KEY']) assert.ok(kept.includes(k), k);
    assert.ok(overridden.includes('HOOKS_PUBLIC_URL'));
  });

  it('che bí mật khi in: 4 ký tự cuối; URL Postgres che mật khẩu', () => {
    assert.equal(mask('PG_PW_TENANT_APP', 'pw-tenant-secret-BBBB'), '****BBBB');
    assert.equal(mask('LLM_SEED_API_KEY', 'sk-llm-0000-LLMK'), '****LLMK');
    assert.equal(mask('PLATFORM_DATABASE_URL', 'postgresql://u:secret@localhost:5432/db'), 'postgresql://u:****@localhost:5432/db');
    assert.equal(mask('WEB_PORT', '5200'), '5200');
  });
});

describe('CLI an toàn', () => {
  const run = (args, cwd) => {
    try {
      execFileSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8', stdio: 'pipe' });
      return 0;
    } catch (e) {
      return e.status;
    }
  };

  it('k = 0 / 4 → mã 2; --write ở checkout chính (repo không phải worktree) → mã 2', () => {
    const repo = mkdtempSync(join(tmpdir(), 'wtenv-main-'));
    execFileSync('git', ['init', '-q'], { cwd: repo });
    writeFileSync(join(repo, '.env'), BASE);
    assert.equal(run(['--k', '0'], repo), 2);
    assert.equal(run(['--k', '4'], repo), 2);
    assert.equal(run(['--k', '1'], repo), 0);
    assert.equal(run(['--k', '1', '--write'], repo), 2);
  });

  it('worktree có `.env` không do script sinh → từ chối khi thiếu --force; --force chép .env.bak rồi ghi', () => {
    const repo = mkdtempSync(join(tmpdir(), 'wtenv-repo-'));
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'x'], { cwd: repo });
    writeFileSync(join(repo, '.env'), BASE);
    const wt = join(mkdtempSync(join(tmpdir(), 'wtenv-wt-')), 'wt1');
    execFileSync('git', ['worktree', 'add', '-q', '--detach', wt], { cwd: repo });
    writeFileSync(join(wt, '.env'), 'HAND=1\n');
    assert.equal(run(['--k', '1', '--write'], wt), 2);
    assert.equal(run(['--k', '1', '--write', '--force'], wt), 0);
    assert.equal(run(['--k', '1', '--write'], wt), 0);
  });
});

describe('--check (AC3)', () => {
  it('parseExcluded đọc bảng netsh; isExcluded', () => {
    const txt = 'Start Port    End Port\n----------    --------\n      5357        5357\n      5100        5120     *\n';
    const r = parseExcluded(txt);
    assert.deepEqual(r, [{ start: 5357, end: 5357 }, { start: 5100, end: 5120 }]);
    assert.equal(isExcluded(5117, r), true);
    assert.equal(isExcluded(5161, r), false);
  });

  it('cổng 5101 bị chiếm → đỏ đúng một mục; dải netsh chứa 5117 → thêm đúng mục đó; cổng do wt1 chạy không đỏ', async () => {
    const busy = new Set([5101]);
    const deps = (o = {}) => ({
      portFree: async (p) => !busy.has(p),
      instanceAt: async () => null,
      redisPing: async () => true,
      excluded: null,
      databases: async () => ({ appchat_platform_wt1: true }),
      ...o,
    });
    let rows = await checkItems(1, deps());
    assert.deepEqual(rows.filter((x) => !x.ok).map((x) => x.item), ['cổng api 5101']);
    rows = await checkItems(1, deps({ excluded: async () => '      5117        5117     *\n' }));
    assert.deepEqual(rows.filter((x) => !x.ok).map((x) => x.item), ['cổng api 5101', 'cổng e2eWeb 5117 (Hyper-V)']);
    rows = await checkItems(1, deps({ instanceAt: async (p) => (p === 5101 ? 'wt1' : null) }));
    assert.equal(rows.find((x) => x.item === 'cổng api 5101').ok, true);
    rows = await checkItems(1, deps({ redisPing: async () => false, databases: async () => ({ appchat_platform_wt1: false }) }));
    assert.deepEqual(rows.filter((x) => !x.ok).map((x) => x.item), ['cổng api 5101', 'Memurai 6381', 'DB appchat_platform_wt1']);
  });

  it('portFree thật: server giả giữ cổng → false; đóng → true', async () => {
    const s = http.createServer();
    await new Promise((ok) => s.listen(0, '127.0.0.1', ok));
    const port = s.address().port;
    assert.equal(await portFree(port), false);
    await new Promise((ok) => s.close(ok));
    assert.equal(await portFree(port), true);
  });
});
