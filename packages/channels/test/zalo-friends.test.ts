// TIP-014b E — bạn bè Zalo: năng lực `friend_requests` / `find_user` chỉ ở Zalo; id hỏng / lời nhắn quá 150 / SĐT không phải di động VN
// → từ chối TRƯỚC khi gọi kênh; sự kiện `friend_event` → FriendEvent (id hỏng → bỏ); chưa chạy phiên → ChannelNotRunningError.
import { describe, expect, it } from 'vitest';
import { ChannelNotRunningError, ChannelOperationError, FakeZaloTransport, FRIEND_MESSAGE_MAX, ZaloPersonalAdapter, operationMode, type ProviderEvent } from '../src';
import { channelRegistry } from '../src/registry';
import { friendEvent } from '../src/zalo-personal/provider-friends';

const ACC = '0190f000-0000-7000-8000-0000000000c2';

async function setup() {
  const transport = new FakeZaloTransport(1);
  const adapter = new ZaloPersonalAdapter(transport, async (url) => Buffer.from(url));
  const events: ProviderEvent[] = [];
  const r = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, { push: async () => undefined, event: async (e) => void events.push(e) });
  return { adapter, s: transport.session(ACC)!, events };
}

describe('bạn bè Zalo', () => {
  it('năng lực: Zalo remote; webchat / email unsupported', () => {
    const caps = (t: string) => channelRegistry.get(t)!.manifest.capabilities.operations;
    for (const k of ['friend_requests', 'find_user'] as const) {
      expect(operationMode(caps('zalo_personal'), k)).toBe('remote');
      expect(operationMode(caps('webchat'), k)).toBe('unsupported');
      expect(operationMode(caps('email'), k)).toBe('unsupported');
    }
  });

  it('nhận / từ chối / gửi / thu hồi gọi đúng lệnh, lời nhắn cắt khoảng trắng', async () => {
    const { adapter, s } = await setup();
    await adapter.friends.accept(ACC, '9101');
    await adapter.friends.reject(ACC, '9102');
    await adapter.friends.send(ACC, '9103', '  Chào anh  ');
    await adapter.friends.undo(ACC, '9103');
    expect(s.ops.map((o) => [o.op, o.userId, o.text])).toEqual([
      ['friend_accept', '9101', undefined],
      ['friend_reject', '9102', undefined],
      ['friend_send', '9103', 'Chào anh'],
      ['friend_undo', '9103', undefined],
    ]);
  });

  it('id hỏng / lời nhắn quá dài / SĐT sai → từ chối trước khi gọi kênh', async () => {
    const { adapter, s } = await setup();
    await expect(adapter.friends.accept(ACC, 'abc')).rejects.toMatchObject({ reason: 'unsafe_ref' });
    await expect(adapter.friends.send(ACC, '99999999999999999999', 'hi')).rejects.toBeInstanceOf(ChannelOperationError);
    await expect(adapter.friends.send(ACC, '9103', 'x'.repeat(FRIEND_MESSAGE_MAX + 1))).rejects.toMatchObject({ reason: 'invalid' });
    await expect(adapter.friends.findUser(ACC, '0123456789')).rejects.toMatchObject({ reason: 'invalid' });
    await expect(adapter.friends.findUser(ACC, '+84912345678')).rejects.toMatchObject({ reason: 'invalid' });
    expect(s.ops).toEqual([]);
  });

  it('tra SĐT: có → id + tên; không có → null; id trả về hỏng → null', async () => {
    const { adapter, s } = await setup();
    s.phoneBook.set('0912345678', { id: '9201', displayName: 'Người lạ A', avatar: 'https://cdn.zalo.test/a.jpg' });
    s.phoneBook.set('0912345670', { id: 'x1', displayName: 'Hỏng' });
    expect(await adapter.friends.findUser(ACC, '0912345678')).toEqual({ id: '9201', displayName: 'Người lạ A', avatarUrl: 'https://cdn.zalo.test/a.jpg' });
    expect(await adapter.friends.findUser(ACC, '0912345679')).toBeNull();
    expect(await adapter.friends.findUser(ACC, '0912345670')).toBeNull();
  });

  it('sự kiện kênh → FriendEvent; id hỏng → bỏ; lời nhắn cắt 150', async () => {
    const { s, events } = await setup();
    s.emitFriend({ type: 'request', userId: '9101', message: 'y'.repeat(200), ts: '1767225600000' });
    s.emitFriend({ type: 'request', userId: 'abc' });
    await new Promise((r) => setTimeout(r, 0));
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: 'friend', type: 'request', accountId: ACC, userId: '9101', self: false, at: '2026-01-01T00:00:00.000Z', key: 'friend:request:9101:1767225600000' });
    expect((events[0] as { message: string }).message).toHaveLength(FRIEND_MESSAGE_MAX);
    expect(friendEvent(ACC, { type: 'added', userId: '9101', isSelf: true, ts: 'bad' })).toMatchObject({ type: 'added', self: true, at: '1970-01-01T00:00:00.000Z' });
  });

  it('chưa chạy phiên → ChannelNotRunningError; nhà cung cấp từ chối → rejected', async () => {
    const { adapter, s } = await setup();
    s.friendMode = 'reject';
    await expect(adapter.friends.accept(ACC, '9101')).rejects.toMatchObject({ reason: 'rejected' });
    await expect(adapter.friends.accept('0190f000-0000-7000-8000-0000000000ff', '9101')).rejects.toBeInstanceOf(ChannelNotRunningError);
  });
});
