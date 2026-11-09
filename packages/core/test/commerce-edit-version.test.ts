// TIP-032c §2–§3: biên nhận hoàn tác — không có `after_version` (log cũ) → 409 legacy; phiên bản hiện tại khác → 409 (bản ghi sau bất kỳ,
// kể cả không liên quan — chống ABA); khớp → được.
import { describe, expect, it } from 'vitest';
import { assertReceiptFresh } from '../src/sales/orders/editing/order-version';

describe('assertReceiptFresh', () => {
  it('log cũ không có after_version → 409 legacy', () => {
    expect(() => assertReceiptFresh(3, {})).toThrow(expect.objectContaining({ code: 'CONFLICT', fields: { receipt: 'legacy' } }));
    expect(() => assertReceiptFresh(3, { after_version: '3' })).toThrow(expect.objectContaining({ httpStatus: 409 }));
  });
  it('lệch phiên bản → 409; khớp → không lỗi', () => {
    expect(() => assertReceiptFresh(4, { after_version: 3 })).toThrow(expect.objectContaining({ fields: { version: 'changed' } }));
    expect(() => assertReceiptFresh(3, { after_version: 3 })).not.toThrow();
  });
});
