// TIP-032c: schema sửa hợp đồng / đơn — if_version dương tuỳ chọn, assigned_user_id (id | null), owner_user_id vẫn nhận (server 422 khi
// đổi); mô tả action nói rõ người tạo bất biến + dùng assigned_user_id cho người phụ trách.
import { describe, expect, it } from 'vitest';
import { contractDelete, contractUpdate, orderSetDeposit, orderUpdate, orderUpdateShipping } from '../src';

describe('commerce edit schemas', () => {
  it('if_version dương, tuỳ chọn', () => {
    expect(orderUpdate.input.safeParse({ order_id: 'o', patch: {}, if_version: 2 }).success).toBe(true);
    expect(orderUpdate.input.safeParse({ order_id: 'o', patch: {}, if_version: 0 }).success).toBe(false);
    expect(orderSetDeposit.input.safeParse({ order_id: 'o', deposit_amount: '0', if_version: 1 }).success).toBe(true);
    expect(orderUpdateShipping.input.safeParse({ order_id: 'o', shipping: {}, if_version: 1 }).success).toBe(true);
    expect(contractDelete.input.safeParse({ contract_id: 'c', if_version: 3 }).success).toBe(true);
    expect(contractUpdate.input.safeParse({ contract_id: 'c', patch: {} }).success).toBe(true);
  });

  it('assigned_user_id nhận id hoặc null; owner_user_id null để server trả 422 immutable', () => {
    expect(orderUpdate.input.safeParse({ order_id: 'o', patch: { assigned_user_id: null } }).success).toBe(true);
    expect(contractUpdate.input.safeParse({ contract_id: 'c', patch: { assigned_user_id: 'u1', owner_user_id: null } }).success).toBe(true);
  });

  it('mô tả hướng model đúng trường', () => {
    for (const a of [orderUpdate, contractUpdate]) {
      expect(a.description).toMatch(/assigned_user_id/);
      expect(a.description).toMatch(/never change/);
      expect(a.description).toMatch(/if_version/);
    }
  });
});
