// TIP-014b AC2 (unit, DB giả trong bộ nhớ) — kết quả lệnh thao tác kênh: thu hồi chỉ ghi `recalled_at` khi nhà cung cấp xác nhận; hết giờ →
// unknown (tin còn nguyên); lệnh đã kết thúc không đổi lại; ACK cảm xúc của revision cũ không đè ý định mới; self-event trước / sau biên nhận
// gửi ghép đúng msgId (không tạo tin); sự kiện kênh chỉ khớp tin trong đúng tài khoản; tin nhiều phần: gộp phần (partial / confirmed).
import { describe, expect, it } from 'vitest';
import { applySelfRef, saveMessageRefs } from '../src/channels/operations/operation-store';
import { applyOperationResult, applyProviderEvent, foldParts, markInterrupted } from '../src/channels/operations/provider-event';

const NOW = new Date('2026-11-05T03:00:00Z');
const ACC = 'a0000000-0000-4000-8000-000000000001';
const OTHER = 'a0000000-0000-4000-8000-000000000002';
const MSG = 'm0000000-0000-4000-8000-000000000001';

type Rec = Record<string, unknown>;
const match = (row: Rec, where: Rec): boolean =>
  Object.entries(where).every(([k, v]) => {
    if (v && typeof v === 'object' && !(v instanceof Date) && !Array.isArray(v)) {
      const o = v as Rec;
      if ('lt' in o) return (row[k] as number) < (o.lt as number);
      if ('in' in o) return (o.in as unknown[]).includes(row[k]);
      return match(row, o);
    }
    return row[k] === v;
  });

/** Bảng giả tối thiểu cho các hàm cần dùng (findUnique / findFirst / findMany / create / update / updateMany / upsert / delete / deleteMany). */
function table(key: (r: Rec) => string, uniq: (w: Rec) => Rec) {
  const rows = new Map<string, Rec>();
  const find = (where: Rec) => [...rows.values()].find((r) => match(r, uniq(where)));
  return {
    rows,
    findUnique: async ({ where }: { where: Rec }) => find(where) ?? null,
    findFirst: async ({ where }: { where: Rec }) => [...rows.values()].find((r) => match(r, where)) ?? null,
    findMany: async ({ where }: { where: Rec }) => [...rows.values()].filter((r) => match(r, where)).sort((a, b) => (a.partNo as number) - (b.partNo as number)),
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
    delete: async ({ where }: { where: Rec }) => void rows.delete(key(find(where)!)),
    deleteMany: async ({ where }: { where: Rec }) => {
      for (const [k, r] of rows) if (match(r, where)) rows.delete(k);
    },
  };
}

function fakeTx() {
  const t = {
    messageProviderRef: table((r) => `${r.messageId}:${r.partNo}`, (w) => (w.messageId_partNo as Rec) ?? (w.channelAccountId_msgId as Rec) ?? w),
    providerPendingRef: table((r) => `${r.channelAccountId}:${r.msgId}`, (w) => (w.channelAccountId_msgId as Rec) ?? w),
    channelOperation: table((r) => r.id as string, (w) => w),
    messageAccountReaction: table((r) => r.messageId as string, (w) => w),
    messageReaction: table((r) => `${r.messageId}:${r.actorType}:${r.actorId}`, (w) => w),
    message: table((r) => r.id as string, (w) => w),
    conversation: table((r) => r.id as string, (w) => w),
    contact: table((r) => r.id as string, (w) => w),
    // TIP-022c: người ghi thu hồi đi qua hàng rào nguồn khách (khoá + vô hiệu biên nhận) — DB giả không có khách / biên nhận.
    $queryRaw: async () => [],
    $executeRaw: async () => 0,
  };
  void t.message.create({ data: { id: MSG, conversationId: 'c1', channelAccountId: ACC, direction: 'out', recalledAt: null } });
  void t.conversation.create({ data: { id: 'c1', contactId: null, assigneeUserId: null } });
  return t;
}
type Tx = ReturnType<typeof fakeTx>;
const asTx = (t: Tx) => t as never;
const ref = (msgId: string, cliMsgId: string | null = null) => ({ threadId: 'zl_khach', isGroup: false, msgId, cliMsgId });

async function op(t: Tx, over: Rec = {}) {
  await t.channelOperation.create({ data: { id: 'op1', kind: 'recall', channelAccountId: ACC, conversationId: 'c1', messageId: MSG, desired: {}, revision: 0, status: 'dispatch_reserved', result: {}, ...over } });
}

describe('foldParts', () => {
  it('hết xác nhận → confirmed; có unknown → unknown; xác nhận lẫn lỗi → partial; toàn lỗi → failed', () => {
    const p = (...s: ('confirmed' | 'failed' | 'unknown')[]) => s.map((status, part_no) => ({ part_no, status }));
    expect(foldParts(p('confirmed', 'confirmed'))).toBe('confirmed');
    expect(foldParts(p('confirmed', 'unknown'))).toBe('unknown');
    expect(foldParts(p('confirmed', 'failed'))).toBe('partial');
    expect(foldParts(p('failed', 'failed'))).toBe('failed');
  });
});

describe('kết quả lệnh thu hồi', () => {
  it('ACK → recalled_at + event recalled; lặp lại không đổi', async () => {
    const t = fakeTx();
    await op(t);
    const ev = await applyOperationResult(asTx(t), 'op1', { status: 'confirmed' }, NOW);
    expect(ev).toMatchObject([{ topic: 'message.updated', payload: { message_id: MSG, change: 'recalled' } }]);
    expect(t.message.rows.get(MSG)!.recalledAt).toEqual(NOW);
    expect(await applyOperationResult(asTx(t), 'op1', { status: 'failed' }, NOW)).toEqual([]);
    expect(t.channelOperation.rows.get('op1')!.status).toBe('confirmed');
  });

  it('hết giờ / gián đoạn sau khi gọi → unknown, tin còn nguyên (không recalled)', async () => {
    const t = fakeTx();
    await op(t);
    await markInterrupted(asTx(t), 'op1', NOW);
    expect(t.channelOperation.rows.get('op1')).toMatchObject({ status: 'unknown', error: 'interrupted_after_attempt' });
    expect(t.message.rows.get(MSG)!.recalledAt).toBeNull();
  });

  it('nhiều phần: một phần xác nhận + một phần lỗi → partial, không recalled', async () => {
    const t = fakeTx();
    await op(t);
    await applyOperationResult(asTx(t), 'op1', { status: 'unknown', parts: [{ part_no: 0, status: 'confirmed' }, { part_no: 1, status: 'failed', error: 'x' }] }, NOW);
    expect(t.channelOperation.rows.get('op1')!.status).toBe('partial');
    expect(t.message.rows.get(MSG)!.recalledAt).toBeNull();
  });
});

describe('kết quả lệnh cảm xúc — revision đơn điệu', () => {
  it('ACK revision cũ tới sau ACK mới không đè cảm xúc đã xác nhận', async () => {
    const t = fakeTx();
    await t.messageAccountReaction.create({ data: { messageId: MSG, channelAccountId: ACC, desiredEmoji: '❤️', desiredRevision: 2, confirmedEmoji: null, confirmedRevision: 0 } });
    await t.channelOperation.create({ data: { id: 'r1', kind: 'react', channelAccountId: ACC, conversationId: 'c1', messageId: MSG, desired: { emoji: '👍' }, revision: 1, status: 'dispatch_reserved', result: {} } });
    await t.channelOperation.create({ data: { id: 'r2', kind: 'react', channelAccountId: ACC, conversationId: 'c1', messageId: MSG, desired: { emoji: '❤️' }, revision: 2, status: 'dispatch_reserved', result: {} } });
    await applyOperationResult(asTx(t), 'r2', { status: 'confirmed' }, NOW);
    await applyOperationResult(asTx(t), 'r1', { status: 'confirmed' }, NOW);
    expect(t.messageAccountReaction.rows.get(MSG)).toMatchObject({ confirmedEmoji: '❤️', confirmedRevision: 2 });
  });
});

describe('tham chiếu tin + self-event', () => {
  it('self-event TRƯỚC biên nhận gửi → chờ, ghép khi biên nhận tới; SAU → bổ sung cliMsgId', async () => {
    const t = fakeTx();
    expect(await applySelfRef(asTx(t), ACC, ref('7001', '9001'), NOW)).toBe('pending');
    await saveMessageRefs(asTx(t), ACC, MSG, [ref('7001'), ref('7002')], NOW);
    expect(t.messageProviderRef.rows.get(`${MSG}:0`)).toMatchObject({ msgId: '7001', cliMsgId: '9001' });
    expect(t.providerPendingRef.rows.size).toBe(0);
    expect(await applySelfRef(asTx(t), ACC, ref('7002', '9002'), NOW)).toBe('joined');
    expect(t.messageProviderRef.rows.get(`${MSG}:1`)).toMatchObject({ cliMsgId: '9002' });
    // Lặp lại / khác thread không đổi.
    expect(await applySelfRef(asTx(t), ACC, ref('7002', '9999'), NOW)).toBe('noop');
  });

  it('self-event chờ đã hết hạn không được ghép', async () => {
    const t = fakeTx();
    await applySelfRef(asTx(t), ACC, ref('7001', '9001'), new Date(NOW.getTime() - 3_600_000));
    await saveMessageRefs(asTx(t), ACC, MSG, [ref('7001')], NOW);
    expect(t.messageProviderRef.rows.get(`${MSG}:0`)!.cliMsgId).toBeNull();
  });
});

describe('sự kiện kênh', () => {
  it('thu hồi từ kênh khớp đúng tài khoản → recalled; tài khoản khác cùng msgId → bỏ qua', async () => {
    const t = fakeTx();
    await saveMessageRefs(asTx(t), ACC, MSG, [ref('7001', '9001')], NOW);
    const at = NOW.toISOString();
    expect(await applyProviderEvent(asTx(t), { kind: 'recalled', accountId: OTHER, key: 'undo:7001', threadId: 'zl_khach', isGroup: false, msgId: '7001', actorId: 'x', self: false, at }, NOW)).toEqual([]);
    expect(t.message.rows.get(MSG)!.recalledAt).toBeNull();
    const ev = await applyProviderEvent(asTx(t), { kind: 'recalled', accountId: ACC, key: 'undo:7001', threadId: 'zl_khach', isGroup: false, msgId: '7001', actorId: 'me', self: true, at }, NOW);
    expect(ev).toMatchObject([{ payload: { change: 'recalled' } }]);
    expect(t.message.rows.get(MSG)!.recalledAt).toEqual(NOW);
  });

  it('thu hồi tới TRƯỚC ACK của lệnh đang mở → lệnh confirmed (hội tụ), ACK sau không đổi', async () => {
    const t = fakeTx();
    await saveMessageRefs(asTx(t), ACC, MSG, [ref('7001', '9001')], NOW);
    await op(t);
    await applyProviderEvent(asTx(t), { kind: 'recalled', accountId: ACC, key: 'undo:7001', threadId: 'zl_khach', isGroup: false, msgId: '7001', actorId: 'me', self: true, at: NOW.toISOString() }, NOW);
    expect(t.channelOperation.rows.get('op1')!.status).toBe('confirmed');
    expect(await applyOperationResult(asTx(t), 'op1', { status: 'unknown' }, NOW)).toEqual([]);
  });

  it('cảm xúc của khách lưu theo người gửi; gỡ (null) xoá; cảm xúc của chính tài khoản → remote_emoji', async () => {
    const t = fakeTx();
    await saveMessageRefs(asTx(t), ACC, MSG, [ref('7001', '9001')], NOW);
    const base = { kind: 'reaction' as const, accountId: ACC, threadId: 'zl_khach', isGroup: false, msgIds: ['7001'], at: NOW.toISOString() };
    await applyProviderEvent(asTx(t), { ...base, key: 'k1', actorId: 'zl_khach', self: false, emoji: '👍' }, NOW);
    expect([...t.messageReaction.rows.values()]).toMatchObject([{ actorType: 'contact', actorId: 'zl_khach', emoji: '👍' }]);
    await applyProviderEvent(asTx(t), { ...base, key: 'k2', actorId: 'zl_khach', self: false, emoji: null }, NOW);
    expect(t.messageReaction.rows.size).toBe(0);
    await applyProviderEvent(asTx(t), { ...base, key: 'k3', actorId: 'me', self: true, emoji: '❤️' }, NOW);
    expect(t.messageAccountReaction.rows.get(MSG)).toMatchObject({ remoteEmoji: '❤️' });
  });
});
