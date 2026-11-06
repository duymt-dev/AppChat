// TIP-022b AC3 — lời chào: chỉ khi bật tường minh + auto + 1-1 mới + chưa có người + chưa từng chào / không có lịch sử; gửi một lần (pha
// none → pending → acknowledged / unknown); kết quả chưa rõ không gửi lại; crash sau khi có tin chào → coi đã gửi; mục đích greeting chỉ
// nhận khi ràng run + receipt pending (không giả được từ HTTP / model).
import { describe, expect, it } from 'vitest';
import { sendGreeting, wantsGreeting, type Receipt } from '../src/ai/reply/greeting';
import { greetingPurpose } from '../src/inbox/services/greeting-purpose';

const conv = { id: 'c1', aiMode: 'auto', kind: 'direct', assigneeUserId: null } as never;
const turn = { conversationId: 'c1', owner: 'o', fence: 3, epoch: 1, acquiredAt: new Date() };
const NOW = new Date('2026-11-06T03:00:00Z');

function receiptDb(start: Partial<Receipt> = {}) {
  const r = { conversationId: 'c1', sourceMessageId: 'm1', greetingPhase: 'none', greetingMessageId: null, runId: null, ...start } as Receipt;
  return {
    r,
    db: {
      aiTurnReceipt: {
        updateMany: async ({ where, data }: { where: { greetingPhase?: string }; data: Partial<Receipt> }) => {
          if (where.greetingPhase && where.greetingPhase !== r.greetingPhase) return { count: 0 };
          Object.assign(r, data);
          return { count: 1 };
        },
      },
    } as never,
  };
}

describe('lời chào', () => {
  it('điều kiện: bật + có chữ + trong giờ + auto + 1-1 + chưa người + chưa có tin ra / lịch sử', async () => {
    const empty = { message: { findFirst: async () => null } } as never;
    const prior = { message: { findFirst: async () => ({ id: 'x' }) } } as never;
    const g = { enabled: true, text: 'Chào anh chị!', inHours: true };
    expect(await wantsGreeting(empty, conv, g)).toBe(true);
    expect(await wantsGreeting(empty, conv, { ...g, enabled: false })).toBe(false);
    expect(await wantsGreeting(empty, conv, { ...g, text: '  ' })).toBe(false);
    expect(await wantsGreeting(empty, conv, { ...g, inHours: false })).toBe(false);
    expect(await wantsGreeting(empty, { ...(conv as object), aiMode: 'copilot' } as never, g)).toBe(false);
    expect(await wantsGreeting(empty, { ...(conv as object), kind: 'group' } as never, g)).toBe(false);
    expect(await wantsGreeting(empty, { ...(conv as object), assigneeUserId: 'u' } as never, g)).toBe(false);
    expect(await wantsGreeting(prior, conv, g)).toBe(false);
  });

  it('gửi một lần: none → pending → acknowledged; gọi lại không gửi lần hai', async () => {
    const { r, db } = receiptDb();
    const calls: unknown[] = [];
    const executor = { execute: async (ctx: { outboundPurpose?: unknown; idempotencyKey?: string }, id: string) => (calls.push([id, ctx.outboundPurpose, ctx.idempotencyKey]), { status: 200 }) } as never;
    expect(await sendGreeting(db, executor, 'ws', conv, r, { id: 'ag', toolIds: [] }, 'run1', 'Chào!', turn, NOW)).toBe('acknowledged');
    expect(calls).toEqual([['message.send', { kind: 'greeting', runId: 'run1', sourceMessageId: 'm1' }, 'agent-greeting:c1']]);
    expect(await sendGreeting(db, executor, 'ws', conv, r, { id: 'ag', toolIds: [] }, 'run1', 'Chào!', turn, NOW)).toBe('acknowledged');
    expect(calls).toHaveLength(1);
  });

  it('kết quả chưa rõ (lỗi / 202) → unknown, không gửi lại', async () => {
    const { r, db } = receiptDb();
    let n = 0;
    const executor = { execute: async () => (n++, Promise.reject(new Error('network'))) } as never;
    expect(await sendGreeting(db, executor, 'ws', conv, r, { id: 'ag', toolIds: [] }, 'run1', 'Chào!', turn, NOW)).toBe('unknown');
    expect(await sendGreeting(db, executor, 'ws', conv, r, { id: 'ag', toolIds: [] }, 'run1', 'Chào!', turn, NOW)).toBe('unknown');
    expect(n).toBe(1);
  });

  it('crash khi đang pending: có tin chào → acknowledged; chưa có → unknown (không đoán, không gửi)', async () => {
    const never = { execute: async () => Promise.reject(new Error('không được gọi')) } as never;
    const a = receiptDb({ greetingPhase: 'pending', greetingMessageId: 'msg-g' });
    expect(await sendGreeting(a.db, never, 'ws', conv, a.r, { id: 'ag', toolIds: [] }, 'run1', 'x', turn, NOW)).toBe('acknowledged');
    const b = receiptDb({ greetingPhase: 'pending' });
    expect(await sendGreeting(b.db, never, 'ws', conv, b.r, { id: 'ag', toolIds: [] }, 'run1', 'x', turn, NOW)).toBe('unknown');
  });

  it('mục đích greeting: chỉ agent + đúng run + receipt pending; người / sai run / đã có tin → từ chối', async () => {
    const tx = (r: unknown) => ({ aiTurnReceipt: { findUnique: async () => r } }) as never;
    const ok = { runId: 'run1', greetingPhase: 'pending', greetingMessageId: null };
    const p = { kind: 'greeting' as const, runId: 'run1', sourceMessageId: 'm1' };
    expect(await greetingPurpose(tx(ok), { actor: { type: 'agent', id: 'ag' }, runId: 'run1', outboundPurpose: p }, 'c1')).toEqual(p);
    expect(await greetingPurpose(tx(ok), { actor: { type: 'agent', id: 'ag' }, runId: 'run1' }, 'c1')).toBeUndefined();
    await expect(greetingPurpose(tx(ok), { actor: { type: 'user', id: 'u' }, runId: 'run1', outboundPurpose: p }, 'c1')).rejects.toThrow();
    await expect(greetingPurpose(tx(ok), { actor: { type: 'agent', id: 'ag' }, runId: 'run2', outboundPurpose: p }, 'c1')).rejects.toThrow();
    await expect(greetingPurpose(tx({ ...ok, greetingMessageId: 'g' }), { actor: { type: 'agent', id: 'ag' }, runId: 'run1', outboundPurpose: p }, 'c1')).rejects.toThrow();
  });
});
