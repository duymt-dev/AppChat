// TIP-045b annex E / ma trận 9 trên hai DB thật (Postgres 16 nền tảng + tenant): đối soát hằng giờ phát hiện lệch chèn giả — ví ≠ tổng sổ,
// trừ tiền AI không có biên nhận tenant, ghế vượt gói — mà KHÔNG sửa ví / sổ / thành viên; chạy lại cùng mốc không ghi trùng; phát hiện
// không chứa email / tên. EXPLAIN các truy vấn đối soát mới dùng index (không seq scan bảng sổ).
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cutoffOf, reconcileWorkspace, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, withDatabase } from '@appchat/db';
import pg from 'pg';
import { env, startApi, testEmail, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
const RUN = uuidv7();

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  // Gói 1 ghế: owner + 1 thành viên → vượt.
  const plan = await h.platform.plan.create({ data: { id: uuidv7(), key: `t-1seat-${uuidv7().slice(-8)}`, segment: 'business', name: 'Test', maxUsers: 1, maxAgents: null, maxChannels: null, active: false } });
  await h.platform.subscription.upsert({
    where: { workspaceId: h.ws },
    create: { id: uuidv7(), workspaceId: h.ws, planId: plan.id, status: 'active', currentPeriodStart: h.clock.now() },
    update: { planId: plan.id, status: 'active' },
  });
  await h.member('sales');
  // Giờ thật (không theo đồng hồ test): cửa sổ trừ tiền AI tính lùi từ mốc cắt quanh giờ hiện tại.
  const at = new Date(Date.now() - 30 * 60_000);
  // Ví 100 nhưng sổ: +120 grant, −10 trừ AI (bước 0 có biên nhận), −5 trừ AI (bước 1 KHÔNG có biên nhận) → tổng 105 ≠ 100.
  await h.platform.creditWallet.upsert({ where: { workspaceId: h.ws }, create: { workspaceId: h.ws, planBalance: 100n }, update: { planBalance: 100n, topupBalance: 0n } });
  const row = (refType: string, refId: string, delta: bigint, kind: 'grant' | 'usage') => ({ id: uuidv7(), workspaceId: h.ws, delta, balanceAfter: 0n, kind, refType, refId, createdAt: at });
  await h.platform.creditLedger.createMany({ data: [row('plan_grant', `t:${h.ws}`, 120n, 'grant'), row('ai_step', `${RUN}:0`, -10n, 'usage'), row('ai_step', `${RUN}:1`, -5n, 'usage')] });
  const t = await resolver.get(TenantContexts.system(h.ws, 'reconcile-test'));
  await t.aiRun.create({ data: { id: RUN, rootRunId: RUN, kind: 'assistant', status: 'completed', title: 'r', initiatedByUserId: h.user, startedAt: at } });
  await t.aiRunStep.create({ data: { id: uuidv7(), runId: RUN, idx: 0, type: 'llm', credits: 10, meta: { llm_step: 0 }, createdAt: at } });
});

afterAll(async () => {
  await h.platform.reconcileFinding.deleteMany({ where: { workspaceId: h.ws } });
  await h.platform.reconcileCheckpoint.deleteMany({ where: { workspaceId: h.ws } });
  await h.platform.creditLedger.deleteMany({ where: { workspaceId: h.ws } });
  await h?.close();
});

describe('đối soát nền tảng ↔ tenant (Postgres thật)', () => {
  it('phát hiện ví ≠ sổ, trừ AI thiếu biên nhận, ghế vượt gói — không sửa gì, không PII', async () => {
    // Mốc cắt sau mọi dòng fixture (thành viên ghi `now()` của Postgres, sổ ghi giờ đồng hồ test).
    const cutoff = cutoffOf(new Date(Math.max(Date.now(), h.clock.now().getTime()) + 3_600_000));
    const before = { wallet: await h.platform.creditWallet.findUnique({ where: { workspaceId: h.ws } }), ledger: await h.platform.creditLedger.count({ where: { workspaceId: h.ws } }) };
    const tenant = await resolver.get(TenantContexts.system(h.ws, 'reconcile-test'));
    const found = await reconcileWorkspace(h.platform, tenant, h.ws, cutoff);
    expect(found, JSON.stringify(found)).toEqual(
      expect.arrayContaining([
        { check: 'wallet_ledger', reference: 'wallet', severity: 'mismatch', detail: { wallet: '100', ledger: '105' } },
        { check: 'wallet_usage', reference: `run:${RUN}:1`, severity: 'mismatch', detail: { charged: 5, recorded: null } },
        { check: 'membership_seats', reference: 'users', severity: 'mismatch', detail: { members: 2, invites: 0, limit: 1 } },
      ]),
    );
    expect(found.find((f) => f.reference === `run:${RUN}:0`)).toBeUndefined();
    expect(JSON.stringify(found)).not.toContain(testEmail('').split('@')[1]);
    expect(await h.platform.creditWallet.findUnique({ where: { workspaceId: h.ws } })).toEqual(before.wallet);
    expect(await h.platform.creditLedger.count({ where: { workspaceId: h.ws } })).toBe(before.ledger);
  });

  it('EXPLAIN: truy vấn đối soát dùng index (không seq scan credit_ledger / ai_run_step)', async () => {
    const plat = new pg.Client({ connectionString: env.MIGRATOR_DATABASE_URL });
    const ten = new pg.Client({ connectionString: withDatabase(env.MIGRATOR_DATABASE_URL!, (await h.platform.workspace.findUniqueOrThrow({ where: { id: h.ws } })).dbName) });
    await Promise.all([plat.connect(), ten.connect()]);
    try {
      const plan = async (c: pg.Client, q: string, p: unknown[]) => {
        await c.query('SET enable_seqscan = off');
        return (await c.query(`EXPLAIN ${q}`, p)).rows.map((r) => r['QUERY PLAN'] as string).join('\n');
      };
      const usage = await plan(plat, `SELECT ref_id, delta, created_at FROM credit_ledger WHERE workspace_id = $1 AND ref_type = 'ai_step' AND created_at > $2 AND created_at <= $3 ORDER BY created_at, id LIMIT 5001`, [h.ws, new Date(0), new Date()]);
      expect(usage, usage).toMatch(/Index (Only )?Scan using credit_ledger_ws_ref_time_idx/);
      const steps = await plan(ten, `SELECT run_id, credits FROM ai_run_step WHERE run_id = ANY($1::uuid[]) AND type = 'llm'`, [[RUN]]);
      expect(steps).not.toMatch(/Seq Scan on ai_run_step/);
      const jobs = await plan(ten, `SELECT id FROM data_job WHERE actor_id = $1 AND status = 'running' ORDER BY created_at DESC, id DESC LIMIT 21`, [h.user]);
      expect(jobs).toMatch(/data_job_actor_status_page_idx/);
    } finally {
      await Promise.all([plat.end(), ten.end()]);
    }
  });
});
