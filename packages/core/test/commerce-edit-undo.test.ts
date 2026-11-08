// TIP-032c §3: hoàn tác sửa đơn từ chối trước khi đụng DB khi thiếu quyền hiện tại hoặc biên nhận không phải schema 2 đúng action.
import { describe, expect, it } from 'vitest';
import { undoOrderEdit } from '../src/sales/orders/editing/order-undo';
import { undoContractEdit } from '../src/contracts/editing/contract-undo';

const tx = new Proxy({}, { get: () => { throw new Error('không được chạm DB'); } }) as never;
const ctx = (perms: string[]) => ({ workspaceId: 'ws', authz: { isOwner: false, permissions: new Set(perms) } }) as never;
const log = (before: unknown) => ({ id: 'l', actionId: 'order.update', input: {}, before, after: null, result: null, undoUntil: null });

describe('undo guards', () => {
  it('mất quyền order.manage / contract.draft hiện tại → 403', async () => {
    await expect(undoOrderEdit(ctx([]), log({}), tx, 'order.update', new Date())).rejects.toMatchObject({ httpStatus: 403 });
    await expect(undoContractEdit(ctx([]), log({}), tx, new Date())).rejects.toMatchObject({ httpStatus: 403 });
  });
  it('biên nhận cũ / sai action → 409 legacy, không chạm DB', async () => {
    await expect(undoOrderEdit(ctx(['order.manage']), log({ id: 'x', items: [] }), tx, 'order.update', new Date())).rejects.toMatchObject({ fields: { receipt: 'legacy' } });
    await expect(undoOrderEdit(ctx(['order.manage']), log({ schema_version: 2, op: 'order.set_deposit', id: 'x', fields: [] }), tx, 'order.update', new Date())).rejects.toMatchObject({ httpStatus: 409 });
    await expect(undoContractEdit(ctx(['contract.draft']), log({ schema_version: 2, op: 'contract.update', id: 'x' }), tx, new Date())).rejects.toMatchObject({ fields: { receipt: 'legacy' } });
  });
});
