// TIP-025b §A.3–4 — cài đặt nhóm Zalo trên transport giả: manifest khai riêng group_settings / group_mute; vai trò tài khoản suy từ
// creatorId / adminIds; đổi tên 1–100 + bật / tắt link (không gì để đổi → invalid trước khi gọi kênh); tắt thông báo của chính tài khoản;
// chưa chạy phiên → ChannelNotRunningError; nhà cung cấp từ chối → ChannelOperationError (core ghi failed, không thử lại).
import { describe, expect, it } from 'vitest';
import { ChannelNotRunningError, ChannelOperationError, FakeZaloTransport, ZaloPersonalAdapter, buildChannelRegistry, operationMode, type ChannelAccountRuntime } from '../src';

const ACC = '0190f000-0000-7000-8000-0000000000c1';
const G = 'grp-1';

async function running() {
  const transport = new FakeZaloTransport(5);
  const adapter = new ZaloPersonalAdapter(transport, async (u) => Buffer.from(u));
  const { credentials } = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  const account: ChannelAccountRuntime = { id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials, settings: {} };
  await adapter.start(account, { push: async () => undefined });
  const session = transport.session(ACC)!;
  session.remoteGroups.set(G, { groupId: G, name: 'Khách VIP', totalMember: 3, memberIds: ['a', 'b', session.ownId], creatorId: 'a', adminIds: [session.ownId], version: '7', link: null });
  return { adapter, session, ops: adapter.operations! };
}

describe('Zalo cài đặt nhóm (025b)', () => {
  it('manifest: group_settings / group_mute remote ở Zalo; webchat không có', () => {
    const reg = buildChannelRegistry();
    const caps = (t: string) => reg.get(t)?.manifest.capabilities.operations;
    expect(operationMode(caps('zalo_personal'), 'group_settings')).toBe('remote');
    expect(operationMode(caps('zalo_personal'), 'group_mute')).toBe('remote');
    expect(operationMode(caps('webchat'), 'group_settings')).toBe('unsupported');
  });

  it('groupInfo: vai trò tài khoản (phó nhóm → admin; người tạo → owner) + phiên bản', async () => {
    const { ops, session } = await running();
    expect(await ops.groupInfo!(ACC, G)).toMatchObject({ accountRole: 'admin', version: '7', complete: true });
    session.remoteGroups.get(G)!.creatorId = session.ownId;
    expect((await ops.groupInfo!(ACC, G)).accountRole).toBe('owner');
    session.remoteGroups.get(G)!.creatorId = 'a';
    session.remoteGroups.get(G)!.adminIds = [];
    expect((await ops.groupInfo!(ACC, G)).accountRole).toBe('member');
  });

  it('đổi tên + bật link: gọi đúng hàm, phiên bản tăng; tên rỗng / > 100 / không gì để đổi → invalid, không gọi kênh', async () => {
    const { ops, session } = await running();
    expect(await ops.updateGroupSettings!(ACC, G, { name: '  Khách VIP 2026 ', inviteLinkEnabled: true })).toEqual({ linkEnabled: true });
    expect(session.remoteGroups.get(G)).toMatchObject({ name: 'Khách VIP 2026', version: '8' });
    expect(session.remoteGroups.get(G)!.link).toMatch(/^https:\/\/zalo\.me\//);
    const before = session.ops.length;
    for (const patch of [{ name: '   ' }, { name: 'x'.repeat(101) }, {}]) await expect(ops.updateGroupSettings!(ACC, G, patch)).rejects.toBeInstanceOf(ChannelOperationError);
    expect(session.ops.length).toBe(before);
  });

  it('tắt thông báo của tài khoản; nhà cung cấp từ chối → ChannelOperationError', async () => {
    const { ops, session } = await running();
    await ops.setGroupMute!(ACC, G, true);
    expect(session.remoteGroups.get(G)!.muted).toBe(true);
    session.opMode = 'reject';
    await expect(ops.setGroupMute!(ACC, G, false)).rejects.toBeInstanceOf(ChannelOperationError);
  });

  it('chưa chạy phiên → ChannelNotRunningError', async () => {
    const adapter = new ZaloPersonalAdapter(new FakeZaloTransport(5));
    await expect(adapter.operations!.setGroupMute!(ACC, G, true)).rejects.toBeInstanceOf(ChannelNotRunningError);
  });
});
