// TIP-038 pha 4 — email tóm tắt (AC09, DC-241 / DC-366) trên Postgres thật, qua ActionExecutor nguồn system (actor `system:digest`):
//   plan hai lần song song + replay → MỘT dòng mỗi (người, nhịp, kỳ); chưa xác minh email / tắt / hằng tuần quá hạn → không lên lịch (không gửi bù).
//   send → mail theo quyền HIỆN TẠI (Owner thấy việc chờ duyệt, CSKH không); kết quả `sent` + provider_id; gửi lại không gửi lần hai.
//   Rời workspace / tắt sau khi lên lịch → skipped; DND → lùi tới giờ được phép; 4xx → failed; lỗi không chắc → unknown, KHÔNG gửi lại;
//   `sending` bỏ dở → unknown. Workspace thứ hai không thấy sổ / mail của workspace này.
// Nhà cung cấp = console (bộ nhớ) — chưa nghiệm thu với provider thật (Brevo, Q-004). EXPLAIN hàng gửi ghi .data/gate/038p4-explain.txt.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver, type TenantDb } from '@appchat/db';
import { ActionExecutor, DIGEST_ACTOR, digestCtx, uuidv7 } from '@appchat/core';
import { MailSendError } from '@appchat/integrations';
import { env, startApi, type Harness } from './setup';

let h: Harness;
let h2: Harness;
let resolver: TenantDbResolver;
let db: TenantDb;
let ownerEmail: string;

const run = (step: 'plan' | 'send', hh = h) =>
  hh.app.get(ActionExecutor, { strict: false }).execute(digestCtx(hh.ws), 'digest.dispatch', { step });
const mailsTo = (to: string, hh = h) => hh.mail.sent.filter((m) => m.to === to);
const rowOf = (userId: string) => db.digestDelivery.findFirst({ where: { userId } });

/** Thành viên có email đã xác minh (mặc định) + prefs thông báo tuỳ chọn. */
async function person(role: string, prefs: { digest?: string; dnd?: object } = {}, verified = true) {
  const m = await h.member(role);
  if (verified)
    await h.platform.user.update({ where: { id: m.id }, data: { emailVerifiedAt: h.clock.now() } });
  if (prefs.digest || prefs.dnd)
    await h.platform.notificationPref.create({
      data: {
        userId: m.id,
        ...(prefs.digest ? { digest: prefs.digest } : {}),
        ...(prefs.dnd ? { dnd: prefs.dnd } : {}),
      },
    });
  const u = await h.platform.user.findUniqueOrThrow({ where: { id: m.id }, select: { email: true } });
  return { id: m.id, email: u.email };
}

beforeAll(async () => {
  h = await startApi(); // 2026-10-30 08:00Z = 15:00 thứ Sáu giờ VN → kỳ hằng ngày 29/10, mốc gửi 30/10 08:00 VN.
  h2 = await startApi();
  resolver = new TenantDbResolver({
    registry: new PrismaWorkspaceRegistry(h.platform),
    baseUrl: env.TENANT_DATABASE_URL!,
  });
  db = await resolver.get(TenantContexts.system(h.ws, 'digest-test'));
  ownerEmail = (await h.platform.user.findUniqueOrThrow({ where: { id: h.user }, select: { email: true } }))
    .email;
}, 180_000);
afterAll(async () => {
  await resolver?.close();
  await h2?.close();
  await h?.close();
});

describe('plan', () => {
  it('song song + replay → một dòng; chưa xác minh / tắt / hằng tuần quá hạn không lên lịch', async () => {
    const unverified = await person('sales', {}, false);
    const off = await person('sales', { digest: 'off' });
    const weekly = await person('sales', { digest: 'weekly' }); // kỳ tuần gửi thứ Hai 26/10 08:00 — quá hạn 20 giờ → bỏ, không gửi bù
    await Promise.all([run('plan'), run('plan')]);
    await run('plan');
    const owner = await db.digestDelivery.findMany({ where: { userId: h.user } });
    expect(owner).toHaveLength(1);
    expect(owner[0]).toMatchObject({
      cadence: 'daily',
      state: 'queued',
      periodStart: new Date('2026-10-28T17:00:00Z'),
      periodEnd: new Date('2026-10-29T17:00:00Z'),
      nextAttemptAt: new Date('2026-10-30T01:00:00Z'),
    });
    expect(
      await db.digestDelivery.count({ where: { userId: { in: [unverified.id, off.id, weekly.id] } } }),
    ).toBe(0);
    expect(
      await db.actionLog.count({
        where: { actionId: 'digest.dispatch', actorId: DIGEST_ACTOR, source: 'system' },
      }),
    ).toBeGreaterThanOrEqual(3);
  });
});

describe('send', () => {
  it('nội dung theo quyền hiện tại; sent + provider_id; gửi lại không gửi lần hai; workspace khác không thấy', async () => {
    const cs = await person('cs');
    const title = `Gửi báo giá BG-DIGEST-${Date.now() % 10000}`;
    await db.approvalRequest.create({
      data: {
        id: uuidv7(),
        actionId: 'quote.send',
        input: {},
        inputHash: 'x',
        risk: 'send',
        permission: 'quote.send',
        title,
        source: 'agent',
        requestedAt: h.clock.now(),
        expiresAt: new Date(h.clock.now().getTime() + 86_400_000),
      },
    });
    await run('plan');
    const out = await run('send');
    expect(out.status).toBe(200);
    const [mine] = mailsTo(ownerEmail);
    expect(mine?.subject).toContain('29/10/2026');
    expect(mine?.html).toContain(title.replace(/</g, '&#60;'));
    expect(mine?.html).toContain('http://localhost:3000/assistant/approvals');
    const [theirs] = mailsTo(cs.email);
    expect(theirs).toBeDefined();
    expect(theirs!.html).not.toContain(title);
    expect(await rowOf(h.user)).toMatchObject({
      state: 'sent',
      attempts: 1,
      providerId: expect.stringMatching(/^console-/),
      sentAt: expect.any(Date),
    });
    await run('plan');
    await run('send');
    expect(mailsTo(ownerEmail)).toHaveLength(1);
    expect(h2.mail.sent.filter((m) => m.to === ownerEmail || m.to === cs.email)).toEqual([]);
    const db2 = await resolver.get(TenantContexts.system(h2.ws, 'digest-test'));
    expect(await db2.digestDelivery.count()).toBe(0);
  });

  it('rời workspace / tắt sau khi lên lịch → skipped, không gửi', async () => {
    const gone = await person('sales');
    const quiet = await person('sales');
    await run('plan');
    await h.platform.membership.updateMany({
      where: { workspaceId: h.ws, userId: gone.id },
      data: { status: 'removed' },
    });
    await h.platform.notificationPref.create({ data: { userId: quiet.id, digest: 'off' } });
    await run('send');
    expect(await rowOf(gone.id)).toMatchObject({ state: 'skipped', reason: 'removed' });
    expect(await rowOf(quiet.id)).toMatchObject({ state: 'skipped', reason: 'off' });
    expect([...mailsTo(gone.email), ...mailsTo(quiet.email)]).toEqual([]);
  });

  it('nhà cung cấp từ chối (4xx) → failed; lỗi không chắc → unknown và KHÔNG gửi lại; sending bỏ dở → unknown', async () => {
    const send = h.mail.send.bind(h.mail);
    try {
      const bad = await person('sales');
      await run('plan');
      h.mail.send = async () => {
        throw new MailSendError('console', 400);
      };
      await run('send');
      expect(await rowOf(bad.id)).toMatchObject({ state: 'failed', reason: 'provider_400', attempts: 1 });

      const lost = await person('sales');
      await run('plan');
      let calls = 0;
      h.mail.send = async () => {
        calls++;
        throw new Error('ECONNRESET');
      };
      await run('send');
      expect(await rowOf(lost.id)).toMatchObject({ state: 'unknown', reason: 'provider_error' });
      await run('plan');
      await run('send');
      expect(calls).toBe(1);
    } finally {
      h.mail.send = send;
    }
    const stale = uuidv7();
    const now = h.clock.now();
    await db.digestDelivery.create({
      data: {
        id: stale,
        userId: uuidv7(),
        cadence: 'daily',
        periodStart: new Date('2026-10-28T17:00:00Z'),
        periodEnd: new Date('2026-10-29T17:00:00Z'),
        state: 'sending',
        nextAttemptAt: now,
        attemptedAt: new Date(now.getTime() - 11 * 60_000),
        attempts: 1,
      },
    });
    await run('send');
    expect(await db.digestDelivery.findUniqueOrThrow({ where: { id: stale } })).toMatchObject({
      state: 'unknown',
      reason: 'interrupted',
    });
  });

  it('DND phủ 08:00 → lùi tới giờ kết thúc; trước đó không gửi', async () => {
    const p = await person('sales', { dnd: { on: true, from: '07:00', to: '16:00' } });
    await run('plan');
    expect(await rowOf(p.id)).toMatchObject({
      state: 'queued',
      nextAttemptAt: new Date('2026-10-30T09:00:00Z'),
    });
    await run('send');
    expect(mailsTo(p.email)).toEqual([]);
    h.clock.advance(61 * 60_000);
    await run('send');
    expect(mailsTo(p.email)).toHaveLength(1);
    expect(await rowOf(p.id)).toMatchObject({ state: 'sent' });
  });
});

describe('EXPLAIN hàng gửi (migration 20261106013800)', () => {
  it('ghi kế hoạch ra .data/gate/038p4-explain.txt', async () => {
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
      due: `SELECT * FROM digest_delivery WHERE state = 'queued' AND next_attempt_at <= now() ORDER BY next_attempt_at, id LIMIT 50`,
      stale: `SELECT id FROM digest_delivery WHERE state = 'sending' AND attempted_at < now() - interval '10 minutes'`,
      plan: `SELECT id FROM digest_delivery WHERE user_id = '${uuidv7()}' AND cadence = 'daily' AND period_start = now()`,
    };
    const out: string[] = [];
    for (const [k, sql] of Object.entries(q))
      out.push(
        `## ${k}\n${sql}\n${(await c.query(`EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ${sql}`)).rows.map((r) => r['QUERY PLAN']).join('\n')}\n`,
      );
    await c.end();
    const dir = join(__dirname, '../../../../.data/gate');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '038p4-explain.txt'), out.join('\n'));
    expect(out[0]).toMatch(/digest_delivery_actionable_idx/);
    expect(out[1]).toMatch(/digest_delivery_actionable_idx/);
    expect(out[2]).toMatch(/digest_delivery_period_key/);
  });
});
