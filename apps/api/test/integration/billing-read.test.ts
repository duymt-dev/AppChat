// TIP-039 pha 3 (AC07) trên Postgres thật — đọc Gói & Ví:
//   summary: `channels.used` = tài khoản kênh chưa ngắt ở DB tenant (+ chỗ giữ của thao tác chưa xong); hạn mức = gói + addon còn hạn;
//            hai workspace không lẫn số; DB tenant không đọc được → `available: false` (không giả 0).
//   ledger:  > 100 dòng — lọc vào-ra / nguồn / loại / khoảng ngày ở SERVER trước LIMIT, cursor đi hết không trùng / sót, không lẫn workspace;
//            tham số lạ → 400 (không ghép SQL); EXPLAIN dùng index mới.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { BillingReadService, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { ledgerPageSchema } from '@appchat/shared';
import { call, env, startApi, type Harness } from './setup';

let a: Harness;
let b: Harness;
let resolver: TenantDbResolver;
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as any }); // eslint-disable-line @typescript-eslint/no-explicit-any
const act = (h: Harness, id: string, input: unknown) =>
  call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }).then(json);

const SOURCES = ['inbox', 'marketing', 'assistant'] as const;
async function seedLedger(h: Harness, n: number) {
  const base = new Date('2027-03-01T03:00:00.000Z').getTime();
  await h.platform.creditLedger.createMany({
    data: Array.from({ length: n }, (_, i) => ({
      id: uuidv7(base + i * 3_600_000),
      workspaceId: h.ws,
      delta: BigInt(i % 5 === 0 ? 100 : -(i % 7) - 1),
      balanceAfter: 0n,
      kind: i % 5 === 0 ? ('topup' as const) : ('usage' as const),
      refType: 'test',
      refId: `l-${i}`,
      source: i % 5 === 0 ? 'qr' : SOURCES[i % 3],
      createdAt: new Date(base + i * 3_600_000),
    })),
  });
}
async function all(h: Harness, qs: string) {
  const out: { id: string; delta: number; source: string; at: string; kind: string }[] = [];
  let cursor: string | null = null;
  for (let guard = 0; guard < 50; guard++) {
    const r = await json(await call(h, `/billing/ledger?limit=17&${qs}${cursor ? `&cursor=${cursor}` : ''}`));
    expect(r.status, JSON.stringify(r.body)).toBe(200);
    expect(ledgerPageSchema.safeParse(r.body).success).toBe(true);
    out.push(...r.body.data);
    cursor = r.body.next_cursor;
    if (!cursor) break;
  }
  return out;
}

beforeAll(async () => {
  a = await startApi();
  b = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(a.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  await seedLedger(a, 130);
  await seedLedger(b, 20);
}, 240_000);
afterAll(async () => {
  await resolver?.close();
  await a?.close();
  await b?.close();
});

describe('summary — kênh dùng + hạn mức addon', () => {
  it('channels.used đếm kênh chưa ngắt ở DB tenant, tách workspace; addon cộng vào max', async () => {
    expect((await act(a, 'webchat.update_widget', { enabled: true, name: 'Web A' })).status).toBe(200);
    const db = await resolver.get(TenantContexts.system(a.ws, 't'));
    await db.channelAccount.create({
      data: {
        id: uuidv7(),
        type: 'email',
        name: 'Cũ',
        status: 'disconnected',
        externalId: `old-${uuidv7()}`,
      },
    });
    const s = await json(await call(a, '/billing/summary'));
    expect(s.body.data.channels).toMatchObject({ used: 1, available: true });
    expect((await json(await call(b, '/billing/summary'))).body.data.channels).toMatchObject({
      used: 0,
      available: true,
    });
    const team = await a.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
    await a.platform.subscription.upsert({
      where: { workspaceId: a.ws },
      create: {
        id: uuidv7(),
        workspaceId: a.ws,
        planId: team.id,
        status: 'active',
        currentPeriodStart: a.clock.now(),
      },
      update: { planId: team.id, status: 'active' },
    });
    await a.platform.subscriptionAddon.create({
      data: {
        id: uuidv7(),
        workspaceId: a.ws,
        invoiceId: uuidv7(),
        resource: 'channels',
        quantity: 2,
        startsAt: a.clock.now(),
        endsAt: new Date(a.clock.now().getTime() + 86_400_000),
        status: 'active',
      },
    });
    const s2 = await json(await call(a, '/billing/summary'));
    expect(s2.body.data.channels.max).toBe(team.maxChannels! + 2);
  });

  it('DB tenant không đọc được → available false, used 0 (không giả số)', async () => {
    const svc = new BillingReadService(
      a.platform,
      () => a.clock.now(),
      async () => {
        throw new Error('tenant down');
      },
    );
    expect((await svc.summary(a.ws)).channels).toMatchObject({ used: 0, available: false });
  });
});

describe('ledger — lọc server-side + cursor', () => {
  it('130 dòng: không lọc đi hết đúng 130, sắp desc, không trùng; không lẫn workspace B', async () => {
    const rows = await all(a, '');
    expect(rows.length).toBe(
      130 + (await a.platform.creditLedger.count({ where: { workspaceId: a.ws, refType: { not: 'test' } } })),
    );
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length);
    const ats = rows.map((r) => Date.parse(r.at));
    expect(ats).toEqual([...ats].sort((x, y) => y - x));
    expect((await all(b, '')).length).toBe(20);
  });

  it('dir / source / kind / from-to lọc trước LIMIT — đủ bản ghi khớp, không chỉ trong 50 dòng đầu', async () => {
    const out = await all(a, 'dir=out');
    expect(out.length).toBe(
      await a.platform.creditLedger.count({ where: { workspaceId: a.ws, delta: { lt: 0 } } }),
    );
    expect(out.every((r) => r.delta < 0)).toBe(true);
    const mk = await all(a, 'source=marketing');
    expect(mk.length).toBe(
      await a.platform.creditLedger.count({ where: { workspaceId: a.ws, source: 'marketing' } }),
    );
    expect(mk.length).toBeGreaterThan(17);
    const top = await all(a, 'kind=topup');
    expect(top.every((r) => r.kind === 'topup')).toBe(true);
    // 01/03 03:00Z + i giờ; lịch workspace (UTC+7): ngày 02/03 = 01/03 17:00Z → 02/03 17:00Z → i = 14..37 → 24 dòng (mốc theo múi workspace).
    const day = await all(a, 'from=2027-03-02&to=2027-03-02');
    expect(day.length).toBe(24);
    expect(Date.parse(day.at(-1)!.at)).toBe(Date.parse('2027-03-01T17:00:00.000Z'));
  });

  it('tham số lạ → 400 có ô lỗi', async () => {
    for (const [qs, field] of [
      ['kind=bogus', 'kind'],
      ['dir=sideways', 'dir'],
      ['source=DROP%20TABLE', 'source'],
      ['from=2027-02-30', 'from'],
      ['from=2027-03-05&to=2027-03-01', 'to'],
      ['cursor=bm9wZQ', 'cursor'],
    ] as const) {
      const r = await json(await call(a, `/billing/ledger?${qs}`));
      expect([r.status, Object.keys(r.body.error.fields ?? {})], qs).toEqual([400, [field]]);
    }
  });

  it('EXPLAIN: lọc nguồn / loại dùng index mới', async () => {
    const c = new pg.Client({ connectionString: env.MIGRATOR_DATABASE_URL });
    await c.connect();
    try {
      await c.query('ANALYZE credit_ledger');
      await c.query('SET enable_seqscan = off');
      const plan = async (q: string, p: unknown[]) =>
        (await c.query(`EXPLAIN ${q}`, p)).rows.map((r) => r['QUERY PLAN'] as string).join('\n');
      expect(
        await plan(
          `SELECT id, created_at FROM credit_ledger WHERE workspace_id = $1 AND source = $2 ORDER BY created_at DESC, id DESC LIMIT 51`,
          [a.ws, 'marketing'],
        ),
      ).toMatch(/credit_ledger_ws_source_created_idx/);
      expect(
        await plan(
          `SELECT id, created_at FROM credit_ledger WHERE workspace_id = $1 AND kind = 'topup' ORDER BY created_at DESC, id DESC LIMIT 51`,
          [a.ws],
        ),
      ).toMatch(/credit_ledger_ws_kind_created_idx/);
    } finally {
      await c.end();
    }
  });
});
