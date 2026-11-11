// TIP-003c AC2 / AC3 trên Postgres thật: action riêng `quote.system_transition` (expire) — ba worker đồng thời cùng trigger → đúng một
// hiệu ứng / action_log / outbox / biên nhận; gửi lại sau khi xong → phát lại kết quả cũ (không chạy lại); cùng khoá trigger khác digest →
// 409; gia hạn trước khi chạy (thế hệ mới) → trigger cũ 409 ở verifier, trigger thế hệ mới chạy được; vị từ hiện tại thắng → no_effect.
import 'reflect-metadata';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ActionExecutor, quoteExpireTrigger, runSystemAction, uuidv7 } from '@appchat/core';
import { PrismaWorkspaceRegistry, TenantContexts, TenantDbResolver } from '@appchat/db';
import { call, env, startApi, type Harness } from './setup';

let h: Harness;
let resolver: TenantDbResolver;
let ex: ActionExecutor;
const tenant = () => resolver.get(TenantContexts.system(h.ws, 'test'));

beforeAll(async () => {
  h = await startApi();
  resolver = new TenantDbResolver({ registry: new PrismaWorkspaceRegistry(h.platform), baseUrl: env.TENANT_DATABASE_URL! });
  ex = h.app.get(ActionExecutor, { strict: false });
}, 120_000);
afterAll(async () => {
  await resolver?.close();
  await h?.close();
});

async function sentQuote(validUntil: Date) {
  const r = await call(h, '/actions/contact.create', { input: { full_name: `Khách ${uuidv7().slice(-6)}`, phone: `09${String(Date.now()).slice(-8)}` } }, { 'idempotency-key': uuidv7() });
  const contactId = ((await r.json()) as { data: { result: { contact_id: string } } }).data.result.contact_id;
  const id = uuidv7();
  const db = await tenant();
  await db.quote.create({ data: { id, code: `BG-${id.slice(-6)}`, rootQuoteId: id, contactId, status: 'sent', sentAt: new Date(validUntil.getTime() - 15 * 86_400_000), validUntil } });
  return id;
}

const result = (r: { data: unknown }) => (r.data as { result: { disposition: string; reason_code?: string } }).result;

describe('action riêng — replay / đồng thời / thế hệ', () => {
  it('ba worker cùng trigger → một hiệu ứng, một action_log, một quote.expired, một biên nhận applied; gửi lại → kết quả cũ', async () => {
    const id = await sentQuote(new Date(h.clock.now().getTime() - 60_000));
    const q = (await (await tenant()).quote.findUniqueOrThrow({ where: { id } }));
    const t = quoteExpireTrigger(h.ws, q);
    const rs = await Promise.allSettled([1, 2, 3].map(() => runSystemAction(ex, resolver, t)));
    const ok = rs.filter((r) => r.status === 'fulfilled').map((r) => result((r as PromiseFulfilledResult<{ data: unknown }>).value));
    // Kẻ thua cuộc trên khoá idempotency nhận 409 in_progress hoặc phát lại — không bao giờ hiệu ứng thứ hai.
    expect(ok.length).toBeGreaterThanOrEqual(1);
    for (const o of ok) expect(o.disposition).toBe('applied');
    const db = await tenant();
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).status).toBe('expired');
    expect(await db.actionLog.count({ where: { actionId: 'quote.system_transition', result: { path: ['operation_id'], equals: id } } })).toBe(1);
    expect(await db.outboxEvent.count({ where: { topic: 'quote.expired', payload: { path: ['quote_id'], equals: id } } })).toBe(1);
    const rec = await db.systemActionReceipt.findMany({ where: { targetId: id } });
    expect(rec).toHaveLength(1);
    expect(rec[0]).toMatchObject({ phase: 'applied', sourceKind: 'schedule', actionId: 'quote.system_transition' });
    expect(rec[0]!.actionLogId).toBeTruthy();
    // Sau TTL idempotency (khoá khác) vẫn phát lại từ biên nhận bền — không action_log thứ hai.
    const again = await runSystemAction(ex, resolver, { ...t, idempotencyKey: `other:${uuidv7()}` });
    expect(result(again).disposition).toBe('applied');
    expect(await db.actionLog.count({ where: { actionId: 'quote.system_transition', result: { path: ['operation_id'], equals: id } } })).toBe(1);
  });

  it('cùng khoá trigger, digest khác → 409 (biên nhận ghim digest)', async () => {
    const id = await sentQuote(new Date(h.clock.now().getTime() - 60_000));
    const q = await (await tenant()).quote.findUniqueOrThrow({ where: { id } });
    const t = quoteExpireTrigger(h.ws, q);
    await runSystemAction(ex, resolver, t);
    const db = await tenant();
    await db.systemActionReceipt.updateMany({ where: { targetId: id }, data: { inputDigest: 'khac' } });
    await expect(runSystemAction(ex, resolver, { ...t, idempotencyKey: `x:${uuidv7()}` })).rejects.toMatchObject({ code: 'CONFLICT', fields: { receipt: 'digest_mismatch' } });
  });

  it('gia hạn trước khi chạy: trigger cũ → 409 ở verifier (không biên nhận); thế hệ mới chưa tới hạn → no_effect ổn định', async () => {
    const past = new Date(h.clock.now().getTime() - 60_000);
    const id = await sentQuote(past);
    const db = await tenant();
    const stale = quoteExpireTrigger(h.ws, { id, validUntil: past });
    const future = new Date(h.clock.now().getTime() + 7 * 86_400_000);
    await db.quote.update({ where: { id }, data: { validUntil: future } });
    await expect(runSystemAction(ex, resolver, stale)).rejects.toMatchObject({ code: 'CONFLICT', fields: { trigger: 'stale' } });
    expect(await db.systemActionReceipt.count({ where: { targetId: id } })).toBe(0);
    const fresh = await runSystemAction(ex, resolver, quoteExpireTrigger(h.ws, { id, validUntil: future }));
    expect(result(fresh)).toMatchObject({ disposition: 'no_effect', reason_code: 'not_due' });
    expect((await db.quote.findUniqueOrThrow({ where: { id } })).status).toBe('sent');
    expect(await db.systemActionReceipt.findFirstOrThrow({ where: { targetId: id } })).toMatchObject({ phase: 'no_effect', safeReason: 'not_due' });
  });

  it('EXPLAIN: tra admission theo khoá trigger, khôi phục theo partial, quét keyset báo giá / đề nghị / liệu trình', async () => {
    const db = await tenant();
    const plan = (sql: string) =>
      db.$transaction(async (tx) => {
        await tx.$executeRawUnsafe('SET LOCAL enable_seqscan = off');
        return (await tx.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(`EXPLAIN ${sql}`)).map((r) => r['QUERY PLAN']).join('\n');
      });
    expect(await plan(`SELECT id FROM system_action_receipt WHERE source_kind = 'schedule' AND source_ref = 'quote.expire' AND action_id = 'quote.system_transition' AND target_id = 'x' AND target_generation = 'g' AND milestone = ''`)).toMatch(/Index Scan using system_action_receipt_(trigger_key|source_idx)/);
    expect(await plan(`SELECT id FROM system_action_receipt WHERE phase = 'admitted' AND updated_at < now() ORDER BY phase, updated_at, id LIMIT 200`)).toContain('system_action_receipt_recovery_idx');
    expect(await plan(`SELECT id, valid_until FROM quote WHERE status IN ('sent', 'viewed') AND deleted_at IS NULL AND valid_until < now() ORDER BY valid_until, id LIMIT 200`)).toMatch(/quote_open_(due_keyset|valid_until)_idx/);
    expect(await plan(`SELECT id, expires_at FROM customer_package WHERE status = 'active' AND expires_at IS NOT NULL AND expires_at < now() ORDER BY expires_at, id LIMIT 200`)).toMatch(/customer_package_(expiry_keyset|active_expiry)_idx/);
  });
});
