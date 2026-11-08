// TIP-032c §1: người tạo trong patch sửa — vắng / gửi lại đúng → bỏ qua; khác / rỗng / null → 422 immutable (không bao giờ hiểu là gán người
// phụ trách); người phụ trách null = bỏ giao (không kiểm thành viên), id lạ → 422 not_member.
import { describe, expect, it } from 'vitest';
import { checkAssignee, checkOwnerEcho } from '../src/sales/orders/editing/order-assignment';
import { checkContractOwnerEcho } from '../src/contracts/editing/contract-assignment';

const U = '0190f000-0000-7000-8000-000000000001';

describe('owner echo', () => {
  it('vắng / trùng → bỏ qua', () => {
    expect(() => checkOwnerEcho(undefined, U)).not.toThrow();
    expect(() => checkOwnerEcho(U, U)).not.toThrow();
    expect(() => checkContractOwnerEcho(U, U)).not.toThrow();
  });
  it('khác / rỗng / null → 422 immutable (kể cả khi hiện tại null)', () => {
    for (const [sent, cur] of [['x', U], ['', U], [null, U], [null, null], ['', null]] as const) {
      expect(() => checkOwnerEcho(sent, cur)).toThrow(expect.objectContaining({ code: 'VALIDATION_FAILED', httpStatus: 422, fields: { 'patch.owner_user_id': 'immutable' } }));
      expect(() => checkContractOwnerEcho(sent, cur)).toThrow(expect.objectContaining({ httpStatus: 422 }));
    }
  });
});

describe('assignee', () => {
  const ctx = { workspaceId: 'ws' } as never;
  it('null / vắng → không hỏi danh sách thành viên', async () => {
    const members = { assertMember: () => Promise.reject(new Error('không được gọi')) } as never;
    await expect(checkAssignee(ctx, members, null)).resolves.toBeUndefined();
    await expect(checkAssignee(ctx, members, undefined)).resolves.toBeUndefined();
  });
  it('id → assertMember với trường patch.assigned_user_id', async () => {
    const calls: unknown[] = [];
    const members = { assertMember: async (...a: unknown[]) => void calls.push(a) } as never;
    await checkAssignee(ctx, members, U);
    expect(calls).toEqual([['ws', U, 'patch.assigned_user_id']]);
  });
});
