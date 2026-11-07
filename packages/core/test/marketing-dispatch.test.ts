// TIP-037 (unit, DB / executor giả) — đường gửi chiến dịch: ref `cr_` đi đúng chốt chặn (không lọt sink Inbox), kết quả kênh → đúng một lệnh
// campaign.record_delivery với khoá idempotency theo ref + kết quả (phát lại không ghi đôi), lỗi tạm chưa final không ghi, kết quả một phần
// / chưa rõ → unknown (không gửi lại); đặt chỗ lần hai sau khi sập → không gửi, ghi unknown; action hệ thống chỉ nhận đúng actor.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TenantDbResolver } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { emitSendResult, registerSendResultSink, unregisterSendResultSink, type SendResult } from '../src/channels/services/send-queue';
import { registerSendGuard, unregisterSendGuard } from '../src/channels/services/send-guards';
import { campaignSendGuard } from '../src/marketing/jobs/campaign-results';
import { recipientOfRef, refOf } from '../src/marketing/jobs/campaign-dispatch';
import { MARKETING_ACTORS, assertSystem, systemCtx } from '../src/marketing/services/marketing-system';
import { SYSTEM_ONLY } from '../src/ai/assistant/catalog';

const WS = '0190f000-0000-7000-8000-0000000000ee';
const RID = '0190f000-0000-7000-8000-0000000000a1';
const REF = refOf(RID);
const NOW = new Date('2026-06-24T02:00:00Z');

/** DB tenant giả: một người nhận với send_state + status, đủ cho reserveRecipient. */
function fakeTenants(row: { status: string; send_state: string }) {
  const tx = {
    $queryRaw: async () => [{ ...row, campaign_id: 'c1', contact_id: 'k1' }],
    $executeRaw: async () => 0,
    campaign: { findUnique: async () => ({ status: 'running', deletedAt: null, approvedVersion: 2, version: 2 }) },
    contact: { findUnique: async () => ({ marketingOptOut: false, deletedAt: null }) },
    campaignRecipient: { update: vi.fn(async () => undefined), updateMany: vi.fn(async () => ({ count: 1 })) },
  };
  const db = { $transaction: async <T>(fn: (t: typeof tx) => Promise<T>) => fn(tx), campaignRecipient: tx.campaignRecipient };
  return { tenants: { get: async () => db } as unknown as TenantDbResolver, tx };
}

function setup(row = { status: 'pending', send_state: 'none' }) {
  const calls: { key: string; id: string; input: Record<string, unknown> }[] = [];
  const executor = { execute: vi.fn(async (ctx: { idempotencyKey?: string }, id: string, input: unknown) => (calls.push({ key: ctx.idempotencyKey!, id, input: input as Record<string, unknown> }), {})) };
  const f = fakeTenants(row);
  const guard = campaignSendGuard({ tenants: f.tenants, executor: executor as never, now: () => NOW });
  registerSendGuard('cr_', guard);
  return { calls, guard, tx: f.tx };
}

afterEach(() => unregisterSendGuard('cr_'));

describe('ref chiến dịch', () => {
  it('cr_<id> ↔ id; ref khác tiền tố không phải người nhận', () => {
    expect(recipientOfRef(REF)).toBe(RID);
    expect(recipientOfRef('msg_1')).toBeNull();
  });
});

describe('kết quả gửi → campaign.record_delivery', () => {
  it('accepted đi đúng chốt chặn, không lọt sink Inbox; phát lại cùng kết quả dùng cùng khoá idempotency', async () => {
    const { calls } = setup();
    const sink = vi.fn(async () => undefined);
    registerSendResultSink('test-inbox', sink);
    const ok: SendResult = { ok: true, ws: WS, account_id: 'acc', ref_id: REF, external_msg_id: 'z1' } as SendResult;
    await emitSendResult(ok, true);
    await emitSendResult(ok, true);
    unregisterSendResultSink('test-inbox');
    expect(sink).not.toHaveBeenCalled();
    expect(calls).toHaveLength(2);
    expect(calls[0]).toMatchObject({ id: 'campaign.record_delivery', input: { delivery_ref: REF, outcome: 'accepted', definite: true, external_msg_id: 'z1' } });
    expect(calls[0]!.key).toBe(calls[1]!.key);
  });

  it('lỗi tạm chưa final → không ghi (BullMQ còn thử); final → failed chắc chắn; một phần / chưa rõ → unknown', async () => {
    const { calls } = setup();
    const base = { ok: false, ws: WS, account_id: 'acc', ref_id: REF, error: 'timeout' } as const;
    await emitSendResult({ ...base, final: false } as SendResult, true);
    expect(calls).toHaveLength(0);
    await emitSendResult({ ...base, final: true } as SendResult, true);
    await emitSendResult({ ...base, final: true, outcome: 'unknown' } as SendResult, true);
    expect(calls.map((c) => [c.input.outcome, c.input.definite])).toEqual([
      ['failed', true],
      ['unknown', false],
    ]);
  });
});

describe('đặt chỗ trước kênh', () => {
  it('lần đầu → đặt chỗ, gửi; đã đặt chỗ trước đó (sập giữa chừng) → KHÔNG gửi lại, ghi unknown', async () => {
    const first = setup();
    expect(await first.guard.reserve(WS, REF)).toBe(true);
    expect(first.tx.campaignRecipient.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ sendState: 'reserved' }) }));
    unregisterSendGuard('cr_');
    const again = setup({ status: 'pending', send_state: 'reserved' });
    expect(await again.guard.reserve(WS, REF)).toBe(false);
    expect(again.calls[0]).toMatchObject({ input: { outcome: 'unknown', definite: false } });
  });

  it('người nhận đã kết thúc → không gửi, không ghi gì', async () => {
    const s = setup({ status: 'sent', send_state: 'confirmed' });
    expect(await s.guard.reserve(WS, REF)).toBe(false);
    expect(s.calls).toHaveLength(0);
  });
});

describe('action hệ thống', () => {
  it('chỉ đúng actor hệ thống — UI / Trợ lý / actor khác → 403; không công bố cho Trợ lý', () => {
    const code = (fn: () => void) => {
      try {
        fn();
        return 'ok';
      } catch (e) {
        return (e as AppError).httpStatus;
      }
    };
    expect(code(() => assertSystem(systemCtx(WS, MARKETING_ACTORS.delivery, 'k'), MARKETING_ACTORS.delivery))).toBe('ok');
    expect(code(() => assertSystem(systemCtx(WS, MARKETING_ACTORS.metric, 'k'), MARKETING_ACTORS.delivery))).toBe(403);
    expect(code(() => assertSystem({ ...systemCtx(WS, MARKETING_ACTORS.delivery, 'k'), source: 'ui' } as never, MARKETING_ACTORS.delivery))).toBe(403);
    for (const id of ['campaign.dispatch', 'campaign.record_delivery', 'campaign.record_metric', 'campaign.store_analysis', 'campaign.unsubscribe']) expect(SYSTEM_ONLY.has(id)).toBe(true);
  });
});
