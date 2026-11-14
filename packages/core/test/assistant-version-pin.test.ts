// TIP-032c §4.2: thẻ xác nhận của Trợ lý chốt `if_version` lúc xem trước — model không gửi thì điền phiên bản hiện tại; model đã gửi thì giữ;
// action không có phiên bản / id không phải uuid / bản ghi không có → input giữ nguyên.
import { describe, expect, it, vi } from 'vitest';
import { pinVersion } from '../src/ai/assistant/version-pin';

const ID = '0190f2a0-1111-7000-8000-000000000001';
const db = (rows: { version: number }[]) => ({ $queryRaw: vi.fn(async () => rows) }) as never;

describe('pinVersion', () => {
  it('không gửi if_version → điền phiên bản hiện tại', async () => {
    expect(await pinVersion(db([{ version: 4 }]), 'order.update', { order_id: ID, patch: { note: 'x' } })).toEqual({ order_id: ID, patch: { note: 'x' }, if_version: 4 });
    expect(await pinVersion(db([{ version: 2 }]), 'contract.update', { contract_id: ID, patch: {} })).toMatchObject({ if_version: 2 });
  });
  it('đã gửi if_version → giữ nguyên, không đọc DB', async () => {
    const d = db([{ version: 9 }]);
    expect(await pinVersion(d, 'order.set_deposit', { order_id: ID, deposit_amount: '1', if_version: 3 })).toMatchObject({ if_version: 3 });
    expect((d as unknown as { $queryRaw: ReturnType<typeof vi.fn> }).$queryRaw).not.toHaveBeenCalled();
  });
  it('action khác / mã chưa đổi id / không thấy bản ghi → giữ nguyên', async () => {
    const i = { order_id: 'DH-1001', patch: {} };
    expect(await pinVersion(db([{ version: 1 }]), 'order.update', i)).toBe(i);
    expect(await pinVersion(db([{ version: 1 }]), 'order.cancel', { order_id: ID })).toEqual({ order_id: ID });
    expect(await pinVersion(db([]), 'order.update_shipping', { order_id: ID, shipping: {} })).toEqual({ order_id: ID, shipping: {} });
  });
});
