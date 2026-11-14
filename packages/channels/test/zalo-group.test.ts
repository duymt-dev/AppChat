// TIP-023b SPEC D — tạo nhóm Zalo trên transport giả: capability riêng `createGroup` (không suy từ `group`), chưa chạy phiên → lỗi trước khi
// gọi Zalo (thử lại an toàn), thành công trả id nhóm + thành viên thêm được / không, lỗi nhà cung cấp ném nguyên (core ghi unknown).
import { describe, expect, it } from 'vitest';
import { ChannelNotRunningError, FakeZaloTransport, ZaloPersonalAdapter, buildChannelRegistry, type ChannelAccountRuntime } from '../src';

const ACC = '0190f000-0000-7000-8000-0000000000b1';

async function running() {
  const transport = new FakeZaloTransport(5);
  const adapter = new ZaloPersonalAdapter(transport, async (u) => Buffer.from(u));
  const { credentials } = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  const account: ChannelAccountRuntime = { id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials, settings: {} };
  await adapter.start(account, { push: async () => undefined });
  return { transport, adapter, session: transport.session(ACC)! };
}

describe('Zalo createGroup', () => {
  it('capability createGroup chỉ ở kênh có adapter tạo nhóm; webchat / email không có', () => {
    const reg = buildChannelRegistry();
    const caps = (t: string) => reg.get(t)?.manifest.capabilities;
    expect(caps('zalo_personal')).toMatchObject({ group: true, createGroup: true });
    expect(caps('webchat')?.createGroup).toBeFalsy();
    expect(caps('email')?.createGroup).toBeFalsy();
  });

  it('chưa chạy phiên → ChannelNotRunningError, không gọi Zalo', async () => {
    const adapter = new ZaloPersonalAdapter(new FakeZaloTransport(5));
    await expect(adapter.createGroup(ACC, { name: 'Nhóm', members: ['u1'] })).rejects.toBeInstanceOf(ChannelNotRunningError);
  });

  it('thành công: id nhóm + thành viên thêm được / không thêm được', async () => {
    const { adapter, session } = await running();
    const r = await adapter.createGroup(ACC, { name: 'Khách VIP tháng 11', members: ['zl_a', 'blocked_b'] });
    expect(r).toEqual({ groupId: `${session.ownId}-g1`, added: ['zl_a'], failed: ['blocked_b'] });
    expect(session.groups).toEqual([{ groupId: r.groupId, name: 'Khách VIP tháng 11', members: ['zl_a', 'blocked_b'] }]);
  });

  it('lỗi phía Zalo ném nguyên — không tự thử lại, không tạo nhóm thứ hai', async () => {
    const { adapter, session } = await running();
    session.groupMode = 'fail';
    await expect(adapter.createGroup(ACC, { name: 'X', members: ['zl_a'] })).rejects.toThrow('zalo_group_failed');
    expect(session.groups).toHaveLength(0);
  });
});
