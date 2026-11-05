// TIP-014b E (unit, DB giả) — bạn bè Zalo: chỉ nguồn `ui`; nhận / từ chối chỉ khi có lời mời tới; gửi: đã là bạn / đã gửi → 409, người lạ
// → 422, trần / ngày đếm nhật ký gửi (thu hồi rồi gửi lại vẫn tính) → 429; một lệnh mở mỗi người. Preview gửi có cảnh báo rủi ro + trần.
// Worker: ACK → confirmed + đổi state; lỗi nhà cung cấp rõ → failed; mạng → unknown; đã reserved (sập giữa chừng) → unknown, không gọi lại.
import { describe, expect, it } from 'vitest';
import { ChannelOperationError, channelRegistry } from '@appchat/channels';
import { humanOnly, requestFriendOp } from '../src/channels/operations/friend-store';
import { ChannelFriendSendHandler } from '../src/channels/actions/friend.handlers';
import { runFriendOp } from '../src/channels/jobs/friend.processor';

const NOW = new Date('2026-11-05T08:00:00Z');
const ACC = '0190f000-0000-7000-8000-0000000000e1';
type Row = Record<string, unknown>;

function fakeTx(o: { friend?: Row; known?: boolean; sentToday?: number } = {}) {
  const st = { friend: o.friend ?? null, sendLog: [] as Row[], sentToday: o.sentToday ?? 0, locks: 0 };
  const tx = {
    st,
    $executeRaw: async () => void st.locks++,
    $queryRaw: async () => (o.known ? [{ x: 1 }] : []),
    conversation: { findFirst: async () => null },
    contactIdentity: { findUnique: async () => null },
    channelUserLookup: { findFirst: async () => null },
    channelFriend: {
      findUnique: async () => st.friend,
      upsert: async ({ create, update }: { create: Row; update: Row }) => void (st.friend = st.friend ? { ...st.friend, ...update } : create),
    },
    channelFriendSendLog: {
      count: async () => st.sentToday + st.sendLog.length,
      create: async ({ data }: { data: Row }) => void st.sendLog.push(data),
    },
  };
  return tx;
}
const req = (tx: ReturnType<typeof fakeTx>, op: 'accept' | 'reject' | 'send' | 'undo', dailyCap = 20) =>
  requestFriendOp(tx as never, { accountId: ACC, externalId: '9001', op, actorId: 'u1', message: 'Chào', dailyCap, now: NOW });

describe('requestFriendOp', () => {
  it('chỉ nguồn ui', () => {
    expect(() => humanOnly('ui')).not.toThrow();
    for (const s of ['assistant', 'agent', 'task', 'api']) expect(() => humanOnly(s)).toThrow(expect.objectContaining({ httpStatus: 403 }));
  });

  it('nhận / từ chối không có lời mời → 409; có → queued + event', async () => {
    await expect(req(fakeTx(), 'accept')).rejects.toMatchObject({ httpStatus: 409, fields: { external_id: 'no_incoming_request' } });
    await expect(req(fakeTx(), 'undo')).rejects.toMatchObject({ httpStatus: 409, fields: { external_id: 'no_outgoing_request' } });
    const tx = fakeTx({ friend: { state: 'incoming', opStatus: null } });
    expect(await req(tx, 'reject')).toEqual({ topic: 'channel.friend_requested', payload: { channel_account_id: ACC, external_id: '9001', op: 'reject' } });
    expect(tx.st.friend).toMatchObject({ op: 'reject', opStatus: 'queued', opActorId: 'u1', state: 'incoming' });
    expect(tx.st.sendLog).toEqual([]);
  });

  it('lệnh đang mở → 409 operation_pending', async () => {
    for (const s of ['queued', 'dispatch_reserved']) await expect(req(fakeTx({ friend: { state: 'incoming', opStatus: s } }), 'accept')).rejects.toMatchObject({ httpStatus: 409, fields: { external_id: 'operation_pending' } });
  });

  it('gửi: bạn / đã gửi → 409; người lạ → 422; trần → 429; hợp lệ → khoá + ghi nhật ký gửi', async () => {
    await expect(req(fakeTx({ friend: { state: 'friend' }, known: true }), 'send')).rejects.toMatchObject({ fields: { external_id: 'already_friend' } });
    await expect(req(fakeTx({ friend: { state: 'outgoing' }, known: true }), 'send')).rejects.toMatchObject({ fields: { external_id: 'already_requested' } });
    await expect(req(fakeTx(), 'send')).rejects.toMatchObject({ httpStatus: 422, fields: { external_id: 'unknown_identity' } });
    await expect(req(fakeTx({ known: true, sentToday: 2 }), 'send', 2)).rejects.toMatchObject({ httpStatus: 429, fields: { channel_account_id: 'friend_daily_cap' } });
    const tx = fakeTx({ known: true, sentToday: 1 });
    await req(tx, 'send', 2);
    expect(tx.st.locks).toBe(1);
    expect(tx.st.sendLog).toEqual([expect.objectContaining({ channelAccountId: ACC, externalId: '9001', actorId: 'u1', createdAt: NOW })]);
    expect(tx.st.friend).toMatchObject({ state: 'none', op: 'send', opMessage: 'Chào' });
  });
});

describe('ChannelFriendSendHandler.preview', () => {
  const accounts = { live: async () => ({ id: ACC, type: 'zalo_personal', status: 'connected', pausedAt: null, settings: { friend_daily_cap: 7 } }) };
  const h = new ChannelFriendSendHandler(accounts as never, channelRegistry, { now: () => NOW } as never);
  const tx = { channelFriend: { findUnique: async () => ({ state: 'none', displayName: 'Khách Quen' }) } };
  const ctx = (source: string) => ({ workspaceId: 'ws', source, actor: { type: 'user', id: 'u1' } }) as never;

  it('cảnh báo rủi ro + trần đã cấu hình; risk send', async () => {
    const p = await h.preview(ctx('ui'), { channel_account_id: ACC, external_id: '9001', message: '' }, tx as never);
    expect(p).toMatchObject({ risk: 'send', summary: 'Khách Quen', warnings: ['friend_request_risk', 'friend_daily_cap:7'] });
  });

  it('Trợ lý xem trước → 403', async () => {
    await expect(h.preview(ctx('assistant'), { channel_account_id: ACC, external_id: '9001', message: '' }, tx as never)).rejects.toMatchObject({ httpStatus: 403 });
  });
});

describe('runFriendOp', () => {
  function fakeDb(friend: Row) {
    const f = { ...friend };
    const db = {
      f,
      $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn(db),
      $queryRaw: async () => [{ g: 1 }],
      channelFriend: {
        findUnique: async () => f,
        updateMany: async ({ where, data }: { where: Row; data: Row }) => (f.opStatus === where.opStatus ? (Object.assign(f, data), { count: 1 }) : { count: 0 }),
      },
    };
    return db;
  }
  const deps = (db: ReturnType<typeof fakeDb>) => ({ tenants: { get: async () => db } as never, kv: { sadd: async () => 1 } as never, log: { warn: () => undefined } as never, now: () => NOW });
  const adapter = (impl: () => Promise<void>, calls: string[]) =>
    ({ isRunning: () => true, friends: { accept: async (_: string, id: string) => (calls.push(`accept:${id}`), impl()) } }) as never;
  const job = { ws: 'ws', external_id: '9001' };

  it('ACK → confirmed, state friend, xoá lời nhắn tới', async () => {
    const db = fakeDb({ op: 'accept', opStatus: 'queued', state: 'incoming', incomingMessage: 'hi' });
    const calls: string[] = [];
    expect(await runFriendOp(deps(db), ACC, adapter(async () => undefined, calls), job, 1)).toBe('confirmed');
    expect(calls).toEqual(['accept:9001']);
    expect(db.f).toMatchObject({ opStatus: 'confirmed', state: 'friend', incomingMessage: null, opGeneration: 1 });
  });

  it('nhà cung cấp từ chối → failed, state giữ; mạng → unknown', async () => {
    const a = fakeDb({ op: 'accept', opStatus: 'queued', state: 'incoming' });
    expect(await runFriendOp(deps(a), ACC, adapter(() => Promise.reject(new ChannelOperationError('rejected')), []), job)).toBe('failed');
    expect(a.f).toMatchObject({ opStatus: 'failed', state: 'incoming' });
    const b = fakeDb({ op: 'accept', opStatus: 'queued', state: 'incoming' });
    expect(await runFriendOp(deps(b), ACC, adapter(() => Promise.reject(new Error('ECONNRESET')), []), job)).toBe('unknown');
    expect(b.f).toMatchObject({ opStatus: 'unknown', state: 'incoming', opError: 'ECONNRESET' });
  });

  it('đã reserved (sập sau khi gọi) → unknown, không gọi lại; lệnh đã xong → skipped', async () => {
    const calls: string[] = [];
    const a = fakeDb({ op: 'accept', opStatus: 'dispatch_reserved', state: 'incoming' });
    expect(await runFriendOp(deps(a), ACC, adapter(async () => undefined, calls), job)).toBe('unknown');
    expect(a.f).toMatchObject({ opStatus: 'unknown', opError: 'interrupted_after_attempt' });
    expect(await runFriendOp(deps(fakeDb({ op: 'accept', opStatus: 'confirmed' })), ACC, adapter(async () => undefined, calls), job)).toBe('skipped');
    expect(calls).toEqual([]);
  });
});
