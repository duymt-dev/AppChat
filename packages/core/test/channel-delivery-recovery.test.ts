// TIP-014b B (unit, DB giả trong bộ nhớ) — gửi bền + biên nhận:
//  - sổ `outbox_send_part`: đặt chỗ → xác nhận; chạy lại bỏ qua phần đã xác nhận; phần treo `dispatch_reserved` → unknown + dừng (không
//    gửi lại mù); lỗi chắc chắn lần trước → gửi lại được; hash đổi → từ chối;
//  - kết quả gửi `partial` / `unknown` → tin + outbox đúng trạng thái (final, không giả "lỗi"); kết quả lặp sau final → bỏ;
//  - biên nhận: chỉ tăng (sent → delivered → read, không hạ), nhóm "đã xem" của một người không thành "đã xem" cả tin; tin lạ / tài khoản
//    khác → bỏ; lặp → idempotent.
import { describe, expect, it } from 'vitest';
import { applyReceipt, failReservedParts, sendLedger, UnknownPartError } from '../src/channels/operations/delivery-receipts';
import { applySendResult } from '../src/inbox/services/outbound';

const NOW = new Date('2026-11-05T03:00:00Z');
const ACC = 'a0000000-0000-4000-8000-000000000001';
const OB = 'o0000000-0000-4000-8000-000000000001';
const MSG = 'm0000000-0000-4000-8000-000000000001';

type Rec = Record<string, unknown>;
const match = (row: Rec, where: Rec): boolean =>
  Object.entries(where).every(([k, v]) => (v && typeof v === 'object' && !(v instanceof Date) ? ('in' in (v as Rec) ? ((v as Rec).in as unknown[]).includes(row[k]) : match(row, v as Rec)) : row[k] === v));

function table(key: (r: Rec) => string, uniq: (w: Rec) => Rec = (w) => w) {
  const rows = new Map<string, Rec>();
  const find = (where: Rec) => [...rows.values()].find((r) => match(r, uniq(where)));
  return {
    rows,
    findUnique: async ({ where }: { where: Rec }) => find(where) ?? null,
    create: async ({ data }: { data: Rec }) => void rows.set(key(data), { ...data }),
    update: async ({ where, data }: { where: Rec; data: Rec }) => Object.assign(find(where)!, data),
    updateMany: async ({ where, data }: { where: Rec; data: Rec }) => {
      const hit = [...rows.values()].filter((r) => match(r, where));
      for (const r of hit) Object.assign(r, data);
      return { count: hit.length };
    },
    upsert: async ({ where, create, update }: { where: Rec; create: Rec; update: Rec }) => {
      const r = find(where);
      if (r) Object.assign(r, update);
      else rows.set(key(create), { ...create });
    },
  };
}

function fakeDb() {
  const t = {
    outboxSendPart: table((r) => `${r.outboxMessageId}:${r.partNo}`, (w) => (w.outboxMessageId_partNo as Rec) ?? w),
    outboxMessage: table((r) => r.id as string),
    messageProviderRef: table((r) => `${r.messageId}:${r.partNo}`, (w) => (w.channelAccountId_msgId as Rec) ?? (w.messageId_partNo as Rec) ?? w),
    providerPendingRef: table((r) => `${r.channelAccountId}:${r.msgId}`, (w) => (w.channelAccountId_msgId as Rec) ?? w),
    messageReceipt: table((r) => `${r.messageId}:${r.recipientId}`, (w) => (w.messageId_recipientId as Rec) ?? w),
    message: table((r) => r.id as string, (w) => (w.channelAccountId_externalMsgId as Rec) ?? w),
    conversation: table((r) => r.id as string),
    contact: table((r) => r.id as string),
    $executeRaw: async () => 0,
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(t),
  };
  void t.outboxMessage.create({ data: { id: OB, messageId: MSG, channelAccountId: ACC, status: 'sending', attempts: 0 } });
  void t.message.create({ data: { id: MSG, conversationId: 'c1', channelAccountId: ACC, direction: 'out', status: 'sent', recalledAt: null } });
  void t.conversation.create({ data: { id: 'c1', channelAccountId: ACC, contactId: null, assigneeUserId: null } });
  return t;
}
type Db = ReturnType<typeof fakeDb>;
const ledgerOf = (db: Db, isGroup = false) => sendLedger(db as never, { outboxId: OB, accountId: ACC, threadId: isGroup ? 'g1' : 'zl_khach', isGroup, now: () => NOW });
const ref = (msgId: string, isGroup = false) => ({ threadId: isGroup ? 'g1' : 'zl_khach', isGroup, msgId, cliMsgId: null });

describe('sổ gửi từng phần', () => {
  it('đặt chỗ → xác nhận; chạy lại: phần đã xác nhận trả tham chiếu cũ (không gọi kênh)', async () => {
    const db = fakeDb();
    const l = ledgerOf(db);
    expect(await l.reserve(0, 'h0')).toBe('send');
    expect(db.outboxSendPart.rows.get(`${OB}:0`)).toMatchObject({ status: 'dispatch_reserved', channelAccountId: ACC, contentHash: 'h0', attemptedAt: NOW });
    await l.confirm(0, ref('7100000001'));
    expect(db.outboxSendPart.rows.get(`${OB}:0`)).toMatchObject({ status: 'confirmed_sent', msgId: '7100000001', confirmedAt: NOW });
    expect(await ledgerOf(db).reserve(0, 'h0')).toEqual({ skip: ref('7100000001') });
  });

  it('phần treo `dispatch_reserved` từ lần trước → unknown + dừng; lần sau vẫn dừng', async () => {
    const db = fakeDb();
    await ledgerOf(db).reserve(0, 'h0');
    await expect(ledgerOf(db).reserve(0, 'h0')).rejects.toBeInstanceOf(UnknownPartError);
    expect(db.outboxSendPart.rows.get(`${OB}:0`)).toMatchObject({ status: 'unknown', error: 'interrupted_after_attempt' });
    await expect(ledgerOf(db).reserve(0, 'h0')).rejects.toBeInstanceOf(UnknownPartError);
  });

  it('lỗi gọi kênh: chắc chắn → gửi lại được; chưa rõ → dừng; trả số phần đã đặt chỗ', async () => {
    const db = fakeDb();
    await ledgerOf(db).reserve(0, 'h0');
    expect(await failReservedParts(db as never, OB, true, 'rejected:116')).toBe(1);
    expect(db.outboxSendPart.rows.get(`${OB}:0`)!.status).toBe('definite_failure');
    expect(await ledgerOf(db).reserve(0, 'h0')).toBe('send');
    expect(await failReservedParts(db as never, OB, false, 'zalo_network')).toBe(1);
    expect(db.outboxSendPart.rows.get(`${OB}:0`)!.status).toBe('unknown');
    await expect(ledgerOf(db).reserve(0, 'h0')).rejects.toBeInstanceOf(UnknownPartError);
    expect(await failReservedParts(db as never, OB, false, 'x')).toBe(0);
  });

  it('gửi lại phần lỗi chắc chắn với nội dung khác (hash đổi) → từ chối', async () => {
    const db = fakeDb();
    await ledgerOf(db).reserve(0, 'h0');
    await failReservedParts(db as never, OB, true, 'rejected');
    await expect(ledgerOf(db).reserve(0, 'h1')).rejects.toThrow('part_hash_changed');
  });
});

describe('kết quả gửi trung thực', () => {
  const base = { ok: false as const, ws: 'ws', account_id: ACC, ref_id: OB, final: true };
  it('unknown → tin `unknown`, outbox `unknown` (không quét lại); kết quả lặp sau đó bỏ', async () => {
    const db = fakeDb();
    const ev = await applySendResult(db as never, { ...base, error: 'unknown:zalo_network', outcome: 'unknown' }, NOW);
    expect(ev).toMatchObject([{ topic: 'message.updated', payload: { message_id: MSG, change: 'status' } }]);
    expect(db.message.rows.get(MSG)).toMatchObject({ status: 'unknown', error: 'unknown:zalo_network' });
    expect(db.outboxMessage.rows.get(OB)!.status).toBe('unknown');
    expect(await applySendResult(db as never, { ...base, ok: true, external_msg_id: '7100000009' } as never, NOW)).toEqual([]);
    expect(db.message.rows.get(MSG)!.status).toBe('unknown');
  });

  it('partial → tin `partial` + lưu tham chiếu phần đã gửi; outbox dead', async () => {
    const db = fakeDb();
    await applySendResult(db as never, { ...base, error: 'partial:zalo_network', outcome: 'partial', parts: [ref('7100000001')] }, NOW);
    expect(db.message.rows.get(MSG)!.status).toBe('partial');
    expect(db.outboxMessage.rows.get(OB)!.status).toBe('dead');
    expect(db.messageProviderRef.rows.get(`${MSG}:0`)).toMatchObject({ msgId: '7100000001', channelAccountId: ACC });
  });
});

describe('biên nhận', () => {
  const ev = (kind: 'delivered' | 'seen', over: Rec = {}) => ({ kind, accountId: ACC, key: `${kind}:k`, threadId: 'zl_khach', isGroup: false, msgIds: ['7100000001'], recipients: ['zl_khach'], at: NOW.toISOString(), ...over }) as never;
  async function withRef(db: Db, isGroup = false) {
    await db.messageProviderRef.create({ data: { messageId: MSG, partNo: 0, channelAccountId: ACC, msgId: '7100000001', threadId: isGroup ? 'g1' : 'zl_khach' } });
  }

  it('1-1: delivered → read; delivered sau read không hạ; lặp idempotent', async () => {
    const db = fakeDb();
    await withRef(db);
    expect(await applyReceipt(db as never, ev('delivered'), NOW)).toHaveLength(1);
    expect(db.message.rows.get(MSG)!.status).toBe('delivered');
    expect(await applyReceipt(db as never, ev('seen'), NOW)).toHaveLength(1);
    expect(db.message.rows.get(MSG)!.status).toBe('read');
    expect(await applyReceipt(db as never, ev('delivered'), NOW)).toEqual([]);
    expect(await applyReceipt(db as never, ev('seen'), NOW)).toEqual([]);
    expect(db.message.rows.get(MSG)!.status).toBe('read');
    expect(db.messageReceipt.rows.get(`${MSG}:zl_khach`)).toMatchObject({ deliveredAt: NOW, readAt: NOW });
  });

  it('nhóm: "đã xem" của từng người lưu riêng; tin chỉ lên delivered (không suy cả nhóm đã xem)', async () => {
    const db = fakeDb();
    await withRef(db, true);
    await applyReceipt(db as never, ev('seen', { threadId: 'g1', isGroup: true, recipients: ['u1', 'u2'] }), NOW);
    expect(db.message.rows.get(MSG)!.status).toBe('delivered');
    expect([...db.messageReceipt.rows.keys()].sort()).toEqual([`${MSG}:u1`, `${MSG}:u2`]);
    expect(db.messageReceipt.rows.get(`${MSG}:u1`)!.readAt).toEqual(NOW);
  });

  it('tin không có tham chiếu / sai thread / tài khoản khác → bỏ', async () => {
    const db = fakeDb();
    expect(await applyReceipt(db as never, ev('seen'), NOW)).toEqual([]);
    await withRef(db);
    expect(await applyReceipt(db as never, ev('seen', { threadId: 'khac' }), NOW)).toEqual([]);
    expect(await applyReceipt(db as never, ev('seen', { accountId: 'a0000000-0000-4000-8000-000000000002' }), NOW)).toEqual([]);
    expect(db.message.rows.get(MSG)!.status).toBe('sent');
    expect(db.messageReceipt.rows.size).toBe(0);
  });

  it('tin chưa gửi xong (queued / failed / partial) → không nâng trạng thái; unknown + biên nhận → delivered', async () => {
    const db = fakeDb();
    await withRef(db);
    for (const s of ['queued', 'failed', 'partial']) {
      db.message.rows.get(MSG)!.status = s;
      await applyReceipt(db as never, ev('delivered'), NOW);
      expect(db.message.rows.get(MSG)!.status).toBe(s);
    }
    db.message.rows.get(MSG)!.status = 'unknown';
    await applyReceipt(db as never, ev('delivered'), NOW);
    expect(db.message.rows.get(MSG)!.status).toBe('delivered');
  });
});
