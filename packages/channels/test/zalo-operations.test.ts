// TIP-014b AC1 — thao tác Zalo cá nhân trên transport giả với tham chiếu dạng thật (msgId / cliMsgId chuỗi số): map đúng tham số SDK
// (undo / addReaction mã Reactions, "" = gỡ), thiếu cliMsgId / id không an toàn / chưa chạy phiên → từ chối TRƯỚC khi gọi kênh; self-event
// mang cliMsgId; sự kiện thu hồi / cảm xúc của kênh → ProviderEvent; gửi chia đoạn trả tham chiếu từng phần, lỗi giữa chừng → partial.
import { describe, expect, it, vi } from 'vitest';
import {
  ChannelNotRunningError,
  ChannelOperationError,
  FakeZaloTransport,
  PartialSendError,
  ZaloPersonalAdapter,
  emojiOfZalo,
  operationMode,
  zaloId,
  type ProviderEvent,
} from '../src';
import { channelRegistry } from '../src/registry';

const ACC = '0190f000-0000-7000-8000-0000000000b1';

async function setup() {
  const transport = new FakeZaloTransport(1);
  const adapter = new ZaloPersonalAdapter(transport, async (url) => Buffer.from(url));
  const events: ProviderEvent[] = [];
  const sink = { push: async () => undefined, event: async (e: ProviderEvent) => void events.push(e) };
  const r = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, sink);
  return { transport, adapter, events, s: transport.session(ACC)! };
}

const ref = (over: Partial<{ msgId: string; cliMsgId: string | null }> = {}) => ({ threadId: 'zl_khach', isGroup: false, msgId: '7100000001', cliMsgId: '9100000001', ...over });

describe('năng lực thao tác (manifest)', () => {
  it('Zalo remote cho thao tác đã map; webchat / email không khai → unsupported', () => {
    const caps = (t: string) => channelRegistry.get(t)!.manifest.capabilities.operations;
    expect(operationMode(caps('zalo_personal'), 'recall')).toBe('remote');
    expect(operationMode(caps('zalo_personal'), 'react')).toBe('remote');
    expect(operationMode(caps('webchat'), 'recall')).toBe('unsupported');
    expect(operationMode(caps('email'), 'react')).toBe('unsupported');
  });
});

describe('id Zalo an toàn', () => {
  it('chuỗi số nhận; số vượt MAX_SAFE_INTEGER / không nguyên / rỗng bị loại', () => {
    expect(zaloId('7123456789012345678')).toBe('7123456789012345678');
    expect(zaloId(12345)).toBe('12345');
    expect(zaloId(2 ** 60)).toBeNull();
    expect(zaloId(1.5)).toBeNull();
    expect(zaloId('')).toBeNull();
    expect(zaloId('abc')).toBeNull();
  });
});

describe('ZaloPersonalAdapter.operations', () => {
  it('recall → SDK undo với msgId + cliMsgId đúng thread', async () => {
    const { adapter, s } = await setup();
    await adapter.operations.recall!(ACC, ref());
    expect(s.ops).toEqual([{ op: 'undo', threadId: 'zl_khach', isGroup: false, msgId: '7100000001', cliMsgId: '9100000001' }]);
  });

  it('setReaction → mã Reactions; null → "" (Reactions.NONE)', async () => {
    const { adapter, s } = await setup();
    await adapter.operations.setReaction!(ACC, { ...ref(), isGroup: true, threadId: 'g1' }, '❤️');
    await adapter.operations.setReaction!(ACC, ref(), null);
    expect(s.ops.map((o) => [o.op, o.threadId, o.isGroup, o.icon])).toEqual([
      ['react', 'g1', true, '/-heart'],
      ['react', 'zl_khach', false, ''],
    ]);
  });

  it('thiếu cliMsgId → pending_ref; id không an toàn → unsafe_ref; không gọi kênh', async () => {
    const { adapter, s } = await setup();
    await expect(adapter.operations.recall!(ACC, ref({ cliMsgId: null }))).rejects.toMatchObject({ reason: 'pending_ref' });
    await expect(adapter.operations.setReaction!(ACC, ref({ msgId: '99999999999999999999' }), '👍')).rejects.toMatchObject({ reason: 'unsafe_ref' });
    expect(s.ops).toEqual([]);
  });

  it('chưa chạy phiên → ChannelNotRunningError trước khi gọi kênh', async () => {
    const { adapter } = await setup();
    await adapter.stop(ACC);
    await expect(adapter.operations.recall!(ACC, ref())).rejects.toBeInstanceOf(ChannelNotRunningError);
  });

  it('nhà cung cấp trả lỗi rõ → ChannelOperationError rejected; lỗi mạng giữ nguyên (core ghi unknown)', async () => {
    const { adapter, s } = await setup();
    s.opMode = 'reject';
    await expect(adapter.operations.recall!(ACC, ref())).rejects.toBeInstanceOf(ChannelOperationError);
    s.opMode = 'fail';
    const err = await adapter.operations.recall!(ACC, ref()).catch((e: unknown) => e);
    expect(err).not.toBeInstanceOf(ChannelOperationError);
  });

  it('nhóm: info đánh dấu complete theo tổng; link tắt → url null; thêm thành viên thành công một phần', async () => {
    const { adapter, s } = await setup();
    s.remoteGroups.set('g1', { groupId: 'g1', name: 'Nhóm VIP', totalMember: 3, memberIds: ['u1', 'u2'], link: null });
    expect(await adapter.operations.groupInfo!(ACC, 'g1')).toEqual({ groupId: 'g1', name: 'Nhóm VIP', totalMembers: 3, memberIds: ['u1', 'u2'], complete: false, accountRole: null, version: null });
    expect(await adapter.operations.groupLink!(ACC, 'g1')).toEqual({ enabled: false, url: null, expiresAt: null });
    expect(await adapter.operations.addGroupMembers!(ACC, 'g1', ['u3', 'blocked_x', 'u3'])).toEqual({ added: ['u3'], failed: [{ id: 'blocked_x', error: 'blocked' }] });
    await expect(adapter.operations.addGroupMembers!(ACC, 'g1', [])).rejects.toMatchObject({ reason: 'invalid' });
    await expect(adapter.operations.groupInfo!(ACC, 'khong_co')).rejects.toMatchObject({ reason: 'forbidden' });
  });
});

describe('sự kiện kênh → ProviderEvent', () => {
  it('gửi → self-event mang cliMsgId khớp msgId; không vào pipeline tin khách', async () => {
    const { adapter, events, s } = await setup();
    const r = await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: 'Chào chị' });
    expect(r.parts).toEqual([{ threadId: 'zl_khach', isGroup: false, msgId: r.externalMsgId, cliMsgId: null, senderId: s.ownId }]);
    await vi.waitFor(() => expect(events).toHaveLength(1));
    expect(events[0]).toMatchObject({ kind: 'self_ref', accountId: ACC, key: `self:${r.externalMsgId}`, ref: { msgId: r.externalMsgId, cliMsgId: s.sent[0]!.cliMsgId } });
  });

  it('thu hồi / cảm xúc của khách → recalled / reaction; mã lạ bỏ qua', async () => {
    const { events, s } = await setup();
    s.emitUndo({ msgId: '7100000005' });
    s.emitReaction({ msgIds: ['7100000005'], icon: '/-strong' });
    s.emitReaction({ msgIds: ['7100000005'], icon: '/-beer' });
    s.emitReaction({ msgIds: ['7100000005'], icon: '' });
    await vi.waitFor(() => expect(events).toHaveLength(3));
    expect(events.map((e) => [e.kind, e.kind === 'reaction' ? e.emoji : e.kind === 'recalled' ? e.msgId : null])).toEqual([
      ['recalled', '7100000005'],
      ['reaction', '👍'],
      ['reaction', null],
    ]);
    expect(emojiOfZalo('/-beer')).toBeUndefined();
  });

  it('gửi chia đoạn lỗi giữa chừng → PartialSendError mang các phần đã ACK', async () => {
    const { adapter, s } = await setup();
    const long = `${'a'.repeat(1990)} ${'b'.repeat(1990)} ${'c'.repeat(100)}`;
    const orig = s.sendText.bind(s);
    let n = 0;
    s.sendText = async (...a: Parameters<typeof orig>) => {
      if (++n === 2) throw new Error('zalo_network');
      return orig(...a);
    };
    const err = await adapter.send(ACC, { externalThreadId: 'zl_khach', kind: 'text', text: long }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(PartialSendError);
    expect((err as PartialSendError).receipt.parts).toHaveLength(1);
    expect((err as PartialSendError).receipt.parts![0]!.msgId).toBe(s.sent[0]!.id);
  });
});
