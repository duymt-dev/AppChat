// TIP-014b D — hồ sơ công khai Zalo (ảnh đại diện) + danh bạ (D3: trang ≤ 200, bỏ dòng thiếu id, SĐT chỉ khi có): năng lực `profiles = remote` chỉ ở Zalo; một lô ≤ 20 id, bỏ trùng, chỉ trả hồ sơ của id
// đã hỏi; quá lô / id hỏng → từ chối TRƯỚC khi gọi kênh; chưa chạy phiên → ChannelNotRunningError; lỗi nhà cung cấp rõ → rejected.
import { describe, expect, it } from 'vitest';
import { ChannelNotRunningError, ChannelOperationError, FakeZaloTransport, MAX_FRIENDS_PAGE, MAX_PROFILE_BATCH, ZaloPersonalAdapter, operationMode } from '../src';
import { channelRegistry } from '../src/registry';

const ACC = '0190f000-0000-7000-8000-0000000000c1';

async function setup() {
  const transport = new FakeZaloTransport(1);
  const adapter = new ZaloPersonalAdapter(transport, async (url) => Buffer.from(url));
  const r = await adapter.beginLogin(ACC, () => undefined, new AbortController().signal);
  await adapter.start({ id: ACC, workspaceId: 'ws', type: 'zalo_personal', credentials: r.credentials, settings: {} }, { push: async () => undefined, event: async () => undefined });
  return { adapter, s: transport.session(ACC)! };
}

describe('hồ sơ công khai (ảnh đại diện)', () => {
  it('năng lực: Zalo remote; webchat / email unsupported', () => {
    const caps = (t: string) => channelRegistry.get(t)!.manifest.capabilities.operations;
    expect(operationMode(caps('zalo_personal'), 'profiles')).toBe('remote');
    expect(operationMode(caps('webchat'), 'profiles')).toBe('unsupported');
    expect(operationMode(caps('email'), 'profiles')).toBe('unsupported');
  });

  it('một lô, bỏ trùng, chỉ hồ sơ của id đã hỏi; id không có hồ sơ → vắng', async () => {
    const { adapter, s } = await setup();
    s.profiles.set('111', { displayName: 'Chị Hoa', avatar: 'https://cdn.zalo.test/a.jpg' });
    s.profiles.set('222', { displayName: 'Anh Nam' });
    s.profiles.set('999', { displayName: 'Lạ', avatar: 'https://cdn.zalo.test/x.jpg' });
    const r = await adapter.operations.profiles!(ACC, ['111', '222', '111', '333']);
    expect(s.profileCalls).toEqual([['111', '222', '333']]);
    expect(r).toEqual([
      { id: '111', displayName: 'Chị Hoa', avatarUrl: 'https://cdn.zalo.test/a.jpg' },
      { id: '222', displayName: 'Anh Nam' },
    ]);
  });

  it('quá lô / id rỗng → invalid TRƯỚC khi gọi kênh; rỗng → []', async () => {
    const { adapter, s } = await setup();
    const many = Array.from({ length: MAX_PROFILE_BATCH + 1 }, (_, i) => String(1000 + i));
    await expect(adapter.operations.profiles!(ACC, many)).rejects.toBeInstanceOf(ChannelOperationError);
    await expect(adapter.operations.profiles!(ACC, [''])).rejects.toBeInstanceOf(ChannelOperationError);
    expect(await adapter.operations.profiles!(ACC, [])).toEqual([]);
    expect(s.profileCalls).toEqual([]);
  });

  it('chưa chạy phiên → ChannelNotRunningError; nhà cung cấp từ chối → rejected', async () => {
    const { adapter, s } = await setup();
    s.opMode = 'reject';
    await expect(adapter.operations.profiles!(ACC, ['111'])).rejects.toMatchObject({ reason: 'rejected' });
    await expect(adapter.operations.profiles!('0190f000-0000-7000-8000-0000000000ff', ['111'])).rejects.toBeInstanceOf(ChannelNotRunningError);
  });
});

describe('danh bạ (friends)', () => {
  it('năng lực: Zalo remote; webchat unsupported', () => {
    expect(operationMode(channelRegistry.get('zalo_personal')!.manifest.capabilities.operations, 'friends')).toBe('remote');
    expect(operationMode(channelRegistry.get('webchat')!.manifest.capabilities.operations, 'friends')).toBe('unsupported');
  });

  it('theo trang; bỏ dòng thiếu id; SĐT chỉ khi nhà cung cấp trả', async () => {
    const { adapter, s } = await setup();
    s.friendList = [{ id: '1', displayName: 'A', phone: '0909' }, { id: '', displayName: 'Rỗng' }, { id: '2', displayName: '' }, { id: '3', displayName: 'C' }];
    expect(await adapter.operations.friends!(ACC, 1, 3)).toEqual([{ id: '1', displayName: 'A', phone: '0909' }, { id: '2', displayName: '2' }]);
    expect(await adapter.operations.friends!(ACC, 2, 3)).toEqual([{ id: '3', displayName: 'C' }]);
    expect(s.friendPages).toEqual([1, 2]);
  });

  it('trang / cỡ không hợp lệ → invalid trước khi gọi kênh', async () => {
    const { adapter, s } = await setup();
    await expect(adapter.operations.friends!(ACC, 0, 10)).rejects.toBeInstanceOf(ChannelOperationError);
    await expect(adapter.operations.friends!(ACC, 1, MAX_FRIENDS_PAGE + 1)).rejects.toBeInstanceOf(ChannelOperationError);
    expect(s.friendPages).toEqual([]);
  });
});
