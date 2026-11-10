// TIP-003c §3: biên nhận trigger — kết cục từ output (applied / no_effect / handed_off; action cũ không khai → applied), trigger_id tất
// định theo nguồn (cùng nguồn → cùng id; khác thế hệ / mốc → khác id), verifier sales từ chối trigger_id đúc / thế hệ lệch.
import { describe, expect, it } from 'vitest';
import { dispositionOf } from '../src/kernel/actions/system/receipt';
import { stableTriggerId } from '../src/kernel/actions/system/trigger-id';
import { invoiceRemindTrigger, quoteExpireTrigger, verifySalesTrigger } from '../src/sales/system/sources';

const WS = '0190f000-0000-7000-8000-00000000aa01';
const Q = '0190f000-0000-7000-8000-0000000000q1'.replace('q1', 'a1');
const at = new Date('2026-11-20T16:59:59.999Z');

describe('kết cục biên nhận', () => {
  it('đọc disposition / effect_ref / reason_code; mặc định applied; reason bị cắt', () => {
    expect(dispositionOf({ disposition: 'no_effect', operation_id: 'x', reason_code: 'not_due' })).toEqual({ phase: 'no_effect', effectRef: 'x', reason: 'not_due' });
    expect(dispositionOf({ disposition: 'handed_off', operation_id: 'x', effect_ref: 'm1' })).toEqual({ phase: 'handed_off', effectRef: 'm1', reason: null });
    expect(dispositionOf({ status: 'matched' })).toEqual({ phase: 'applied', effectRef: null, reason: null });
    expect(dispositionOf({ disposition: 'void', reason_code: 'x'.repeat(100) }).reason).toHaveLength(64);
  });
});

describe('trigger tất định', () => {
  it('cùng nguồn → cùng id (UUID hợp lệ); khác thế hệ / mốc → khác', () => {
    const a = stableTriggerId('schedule', 'quote.expire', 'quote.system_transition', 'expire', Q, at.toISOString(), '');
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(quoteExpireTrigger(WS, { id: Q, validUntil: at }).input.trigger_id).toBe(a);
    expect(quoteExpireTrigger(WS, { id: Q, validUntil: new Date(at.getTime() + 86_400_000) }).input.trigger_id).not.toBe(a);
    const t1 = invoiceRemindTrigger(WS, { id: Q, dueDate: at }, 'T-1');
    const t2 = invoiceRemindTrigger(WS, { id: Q, dueDate: at }, 'T+1');
    expect(t1.input.trigger_id).not.toBe(t2.input.trigger_id);
    expect(t1.idempotencyKey).toBe(`system:${t1.input.trigger_id}`);
  });
});

describe('verifier sales', () => {
  const db = (validUntil: Date | null) => ({ quote: { findUnique: async () => (validUntil === undefined ? null : { sentAt: at, validUntil, deletedAt: null }) } }) as never;

  it('trigger đúng nguồn + thế hệ hiện tại → qua', async () => {
    await expect(verifySalesTrigger(quoteExpireTrigger(WS, { id: Q, validUntil: at }), db(at))).resolves.toBeUndefined();
  });

  it('trigger_id / entity đúc → 409; thế hệ lệch (gia hạn) → 409; thực thể mất → 404', async () => {
    const t = quoteExpireTrigger(WS, { id: Q, validUntil: at });
    await expect(verifySalesTrigger({ ...t, input: { ...t.input, operation: 'remind' } }, db(at))).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(verifySalesTrigger({ ...t, input: { ...t.input, entity_id: WS } }, db(at))).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(verifySalesTrigger(t, db(new Date(at.getTime() + 7 * 86_400_000)))).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(verifySalesTrigger(t, { quote: { findUnique: async () => null } } as never)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
