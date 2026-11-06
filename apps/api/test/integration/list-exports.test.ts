// TIP-038 pha 3 — xuất 4 danh sách trên Postgres 16 + Memurai thật:
//   AC07 2.100 báo giá (vượt mốc LIMIT 2000 cũ) → 202, worker dựng XLSX ĐỦ 2.100 dòng (không cắt), ô "=…" là chữ, tiền bigint đủ chữ số,
//        cột tuỳ biến bị ẩn với Sales không có; ≤ 50 dòng → 200 + link tải ngay; bộ lọc 0 dòng → tệp chỉ có tiêu đề; quá trần → 422;
//        lọc theo trường ẩn → 422; Sales (own) chỉ xuất bản ghi của mình; đơn / hợp đồng / ticket cùng luật.
//   AC08 người khác (kể cả Manager) 404; vai trò / scope người tạo đổi sau khi xuất → 410 (không phát tệp cũ); quá 24 giờ → 410; worker chạy lại /
//        event lặp → không dựng lần hai; người tạo mất quyền giữa chừng → failed (không có link); gửi lại cùng Idempotency-Key → cùng việc.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import ExcelJS from 'exceljs';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import {
  AuthzResolver,
  STORAGE,
  allowedAction,
  registerListExportKinds,
  runDataJob,
  uuidv7,
  type RunDeps,
} from '@appchat/core';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let sales: { id: string; token: string };
let manager: { id: string; token: string };
let deps: RunDeps;
let lan = '';
const DAY = 86_400_000;

const json = async (r: Response) => ({ status: r.status, body: (await r.json().catch(() => null)) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const as = (u?: { token: string }): Record<string, string> =>
  u ? { authorization: `Bearer ${u.token}` } : {};
const act = (id: string, input: unknown, who?: { token: string }, key = uuidv7()) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': key, ...as(who) }).then(json);
const get = (path: string, who?: { token: string }) => call(h, path, undefined, as(who)).then(json);
const run = (jobId: string, over: Partial<RunDeps> = {}) => runDataJob(db, h.ws, jobId, { ...deps, ...over });

async function sheet(url: string, who?: { token: string }) {
  const res = await fetch(`${h.base}${url}`, {
    headers: { 'x-workspace-id': h.ws, authorization: `Bearer ${(who ?? h).token}` },
  });
  expect(res.status).toBe(200);
  expect(res.headers.get('content-type')).toContain('spreadsheetml');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load((await res.arrayBuffer()) as ArrayBuffer);
  const ws = wb.worksheets[0]!;
  const rows: unknown[][] = [];
  ws.eachRow((r, n) => {
    if (n > 2) rows.push((r.values as unknown[]).slice(1));
    r.eachCell((c) => expect(c.formula).toBeUndefined());
  });
  return { head: (ws.getRow(2).values as unknown[]).slice(1), rows };
}

/** N báo giá (ghi thẳng DB — nhanh; xuất đọc như thật). */
async function quotes(prefix: string, n: number, owner = h.user, extra: Record<string, unknown> = {}) {
  const now = h.clock.now();
  for (let i = 0; i < n; i += 1000) {
    await db.quote.createMany({
      data: Array.from({ length: Math.min(1000, n - i) }, (_, k) => {
        const id = uuidv7(now.getTime());
        return {
          id,
          code: `${prefix}${String(i + k).padStart(5, '0')}`,
          rootQuoteId: id,
          contactId: lan,
          ownerUserId: owner,
          status: 'sent' as const,
          total: 123_456_789_012_345n,
          custom: { hang: 'A', secret: 'x' },
          createdAt: now,
          updatedAt: now,
          ...extra,
        };
      }),
    });
  }
}

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  db = await resolver.get(TenantContexts.system(h.ws, 'exports-test'));
  sales = await h.member('sales');
  manager = await h.member('manager');
  registerListExportKinds(h.app.get(STORAGE, { strict: false }), h.platform);
  const authz = h.app.get(AuthzResolver, { strict: false });
  deps = {
    authzOf: async (ws, userId) => {
      const m = userId
        ? await h.platform.membership.findFirst({
            where: { workspaceId: ws, userId, status: 'active' },
            select: { roleKey: true, delegations: true },
          })
        : null;
      return m ? authz.resolve(ws, userId!, m) : null;
    },
    allowed: allowedAction,
    now: () => h.clock.now(),
    owner: 'test-worker',
  };
  lan = uuidv7();
  await db.contact.create({
    data: { id: lan, code: 'KH-EXP1', name: '=Chị Lan', source: 'manual', ownerUserId: h.user },
  });
  await db.customFieldDef.createMany({
    data: [
      {
        id: uuidv7(),
        entity: 'quote',
        key: 'hang',
        label: 'Hạng',
        type: 'text',
        roles: [],
        visibleIn: { export: true },
      },
      {
        id: uuidv7(),
        entity: 'quote',
        key: 'secret',
        label: 'Mật',
        type: 'text',
        roles: ['owner'],
        visibleIn: { export: true },
      },
    ],
  });
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

describe('AC07 nội dung tệp', () => {
  let big = '';
  it('2.100 báo giá → 202; worker dựng đủ 2.100 dòng, ô "=…" là chữ, bigint đủ chữ số, Owner thấy cột tuỳ biến', async () => {
    await quotes('BGX', 2100);
    const r = await act('quote.export', { q: 'bgx' });
    expect(r.status, JSON.stringify(r.body)).toBe(202);
    big = r.body.data.job_id;
    expect((await get(`/data-jobs/${big}`)).body.data).toMatchObject({
      status: 'queued',
      total: 2100,
      download_url: null,
    });
    expect(await run(big)).toBe('completed');
    expect(await run(big)).toBe('skipped');
    const st = (await get(`/data-jobs/${big}`)).body.data;
    expect(st).toMatchObject({ status: 'completed', total: 2100, done: 2100, failed: 0 });
    const f = await sheet(st.download_url);
    expect(f.rows).toHaveLength(2100);
    expect(f.head).toEqual(expect.arrayContaining(['Mã', 'Tổng cộng (VND)', 'Hạng', 'Mật']));
    expect(f.rows[0]).toEqual(expect.arrayContaining(['=Chị Lan', '123456789012345']));
  }, 120_000);

  it('≤ 50 dòng → 200 + link ngay; Sales chỉ dòng của mình, không có cột tuỳ biến bị ẩn', async () => {
    await quotes('BGS', 3, sales.id);
    const r = await act('quote.export', { q: 'bg' }, sales);
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(r.body.data.result).toMatchObject({ rows: 3, download_url: expect.stringMatching(/\/download$/) });
    const f = await sheet(r.body.data.result.download_url, sales);
    expect(f.rows).toHaveLength(3);
    expect(f.head).toContain('Hạng');
    expect(f.head).not.toContain('Mật');
  });

  it('bộ lọc 0 dòng → tệp chỉ có tiêu đề; lọc trường ẩn → 422; trạng thái lạ không lộ gì', async () => {
    const r = await act('quote.export', { q: 'khong-co-gi' });
    expect(r.status).toBe(200);
    expect(r.body.data.result.rows).toBe(0);
    expect((await sheet(r.body.data.result.download_url)).rows).toEqual([]);
    expect((await act('quote.export', { custom: { secret: 'x' } }, sales)).status).toBe(422);
    expect((await act('quote.export', { status: 'khong_ton_tai' })).body.data.result.rows).toBe(0);
  });

  it('đơn / hợp đồng / ticket: đúng tập theo bộ lọc + scope', async () => {
    const now = h.clock.now();
    await db.order.create({
      data: {
        id: uuidv7(),
        code: 'DH-EXP1',
        contactId: lan,
        ownerUserId: h.user,
        status: 'new',
        total: 5_000_000n,
        subtotal: 5_000_000n,
        createdAt: now,
      },
    });
    await db.contract.create({
      data: {
        id: uuidv7(),
        code: 'HD-EXP1',
        contactId: lan,
        ownerUserId: h.user,
        title: '@Gói năm',
        status: 'draft',
        value: 12_000_000n,
      },
    });
    await db.ticket.create({
      data: {
        id: uuidv7(),
        code: 'TK-EXP1',
        title: '+Khiếu nại',
        category: 'Khác',
        priority: 'high',
        frtDueAt: now,
        ttrStartAt: now,
        ttrDueAt: new Date(now.getTime() + DAY),
      },
    });
    for (const [kind, input, text] of [
      ['order.export', { q: 'DH-EXP1' }, 'DH-EXP1'],
      ['contract.export', { q: 'HD-EXP1' }, '@Gói năm'],
      ['ticket.export', { q: 'TK-EXP1', priority: 'high' }, '+Khiếu nại'],
    ] as const) {
      const r = await act(kind, input);
      expect(r.status, `${kind} ${JSON.stringify(r.body)}`).toBe(200);
      expect(r.body.data.result.rows, kind).toBe(1);
      expect((await sheet(r.body.data.result.download_url)).rows[0], kind).toContain(text);
    }
    expect((await act('order.export', { q: 'DH-EXP1' }, sales)).body.data.result.rows).toBe(0);
  });

  it('gửi lại cùng Idempotency-Key → cùng việc, không chốt lần hai', async () => {
    const key = uuidv7();
    const a = await act('contract.export', {}, undefined, key);
    const b = await act('contract.export', {}, undefined, key);
    expect(b.body.data.result.job_id).toBe(a.body.data.result.job_id);
    expect(await db.dataJob.count({ where: { id: a.body.data.result.job_id } })).toBe(1);
  });

  describe('AC08 quyền / phục hồi', () => {
    it('người khác (kể cả Manager) 404; vai trò / scope đổi sau khi xuất → 410; quá 24 giờ → 410', async () => {
      expect((await get(`/data-jobs/${big}`, manager)).status).toBe(404);
      expect((await get(`/data-jobs/${big}/download`, manager)).status).toBe(404);
      const r = await act('quote.export', { q: 'bgs' }, sales);
      const url = r.body.data.result.download_url as string;
      const job = r.body.data.result.job_id as string;
      expect((await get(url.replace(/^\/v1/, ''), sales)).status).toBe(200);
      // Đổi vai trò người tạo (Sales own → Kế toán sales all): dấu quyền khác → link biến mất, tải 410 (không phát tệp dựng theo quyền cũ).
      await h.platform.membership.updateMany({
        where: { workspaceId: h.ws, userId: sales.id },
        data: { roleKey: 'accountant' },
      });
      await h.platform.workspace.update({ where: { id: h.ws }, data: { authzEpoch: { increment: 1 } } });
      expect((await get(`/data-jobs/${job}`, sales)).body.data.download_url).toBeNull();
      expect((await get(`/data-jobs/${job}/download`, sales)).status).toBe(410);
      await h.platform.membership.updateMany({
        where: { workspaceId: h.ws, userId: sales.id },
        data: { roleKey: 'sales' },
      });
      await h.platform.workspace.update({ where: { id: h.ws }, data: { authzEpoch: { increment: 1 } } });
      h.clock.advance(25 * 60 * 60_000);
      expect((await get(`/data-jobs/${big}/download`)).status).toBe(410);
      expect((await get(`/data-jobs/${big}`)).body.data.download_url).toBeNull();
    });

    it('người tạo mất quyền trước khi worker chạy → failed forbidden, không có link', async () => {
      await quotes('BGF', 60);
      const r = await act('quote.export', { q: 'bgf' });
      expect(r.status).toBe(202);
      const job = r.body.data.job_id as string;
      expect(await run(job, { allowed: () => false })).toBe('failed');
      expect((await get(`/data-jobs/${job}`)).body.data).toMatchObject({
        status: 'failed',
        error: 'forbidden',
        download_url: null,
      });
    });
  });
});

describe('EXPLAIN chốt id xuất (index danh sách có sẵn)', () => {
  it('ghi kế hoạch ra .data/gate/038p3-explain.txt', async () => {
    const ws = await h.platform.workspace.findUniqueOrThrow({
      where: { id: h.ws },
      select: { dbName: true },
    });
    const url = new URL(env.TENANT_DATABASE_URL!);
    url.pathname = `/${ws.dbName}`;
    const c = new pg.Client({ connectionString: url.toString() });
    await c.connect();
    await c.query('SET enable_seqscan = off');
    const q = {
      quote_all: `SELECT q.id FROM quote q WHERE q.deleted_at IS NULL AND q.status <> 'superseded' ORDER BY q.created_at DESC, q.id DESC LIMIT 100001`,
      order_all: `SELECT o.id FROM "order" o WHERE o.deleted_at IS NULL ORDER BY o.created_at DESC, o.id DESC LIMIT 100001`,
      contract_all: `SELECT c.id FROM contract c WHERE c.deleted_at IS NULL ORDER BY c.created_at DESC, c.id DESC LIMIT 100001`,
      job_items: `SELECT seq, target_id FROM data_job_item WHERE job_id = '${uuidv7()}' AND seq > -1 ORDER BY seq LIMIT 1000`,
    };
    const out: string[] = [];
    for (const [k, sql] of Object.entries(q)) {
      const plan = (await c.query(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`)).rows.map(
        (r) => r['QUERY PLAN'],
      );
      out.push([`## ${k}`, sql, ...plan, ''].join('\n'));
    }
    await c.end();
    const dir = join(__dirname, '../../../../.data/gate');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '038p3-explain.txt'), out.join('\n'));
    expect(out[0]).toMatch(/quote_live_recent_idx|quote_live_status_idx/);
    expect(out[1]).toMatch(/order_live_recent_idx/);
    expect(out[2]).toMatch(/contract_live_recent_idx/);
    expect(out[3]).toMatch(/data_job_item_pkey/);
  });
});
