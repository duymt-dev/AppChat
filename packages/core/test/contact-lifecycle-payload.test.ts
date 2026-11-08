// TIP-015f §3.7: hợp đồng payload đơn sàn runtime — biên kích thước / số dòng, qty / tiền / thời điểm hỏng, trường lạ, hash không phụ thuộc
// thứ tự key, giữ tổng của sàn; lý do lỗi đã che (không giá trị).
import { describe, expect, it } from 'vitest';
import { canonicalHash, checkExternalOrder } from '../src/sales/orders/services/external-order-payload';

const now = new Date('2026-11-08T08:00:00.000Z');
const base = () => ({
  external_id: 'SP-1',
  platform: 'shopee',
  platform_status: 'READY',
  buyer: { id: 'b1', name: 'Lan', phone: '0909' },
  lines: [{ sku: 'X', name: 'HIFU', qty: 1, unit_price: '100000' }],
  total: '90000',
  paid: false,
  created_at: '2026-11-08T07:00:00+07:00',
  updated_at: '2026-11-08T07:30:00Z',
});

describe('checkExternalOrder', () => {
  it('hợp lệ → order + hash + mốc cập nhật; giữ tổng sàn', () => {
    const r = checkExternalOrder(base(), now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.order.total).toBe('90000');
      expect(r.updatedAt.toISOString()).toBe('2026-11-08T07:30:00.000Z');
    }
  });

  it('từ chối qty / tiền / thời điểm / trường lạ / số dòng / kích thước — lý do không chứa giá trị', () => {
    const bad: [string, unknown][] = [
      ['qty0', { ...base(), lines: [{ ...base().lines[0], qty: 0 }] }],
      ['qtyNaN', { ...base(), lines: [{ ...base().lines[0], qty: Number.NaN }] }],
      ['moneyFloat', { ...base(), total: '1.5' }],
      ['moneyNeg', { ...base(), total: '-1' }],
      ['moneyHuge', { ...base(), total: '9223372036854775808' }],
      ['noTz', { ...base(), created_at: '2026-11-08T07:00:00' }],
      ['badIso', { ...base(), updated_at: 'xxZ' }],
      ['unknown', { ...base(), secret: { nested: 1 } }],
      ['unknownLine', { ...base(), lines: [{ ...base().lines[0], raw: 1 }] }],
      ['noLines', { ...base(), lines: [] }],
      ['tooManyLines', { ...base(), lines: Array.from({ length: 501 }, () => base().lines[0]) }],
      ['tooLarge', { ...base(), buyer: { id: 'b1', name: 'x'.repeat(500) }, lines: Array.from({ length: 500 }, () => ({ sku: 's'.repeat(256), name: 'n'.repeat(500), qty: 1, unit_price: '1' })) }],
      ['before', { ...base(), updated_at: '2026-11-07T00:00:00Z' }],
      ['future', { ...base(), updated_at: '2026-11-08T08:06:00Z' }],
    ];
    for (const [name, raw] of bad) {
      const r = checkExternalOrder(raw, now);
      expect(r.ok, name).toBe(false);
      if (!r.ok) expect(r.reason, name).not.toMatch(/Lan|0909|secret/);
    }
    expect(checkExternalOrder({ ...base(), updated_at: '2026-11-08T08:04:00Z' }, now).ok).toBe(true);
  });

  it('hash chuẩn tắc: thứ tự key / múi giờ / 0 đầu không đổi hash; đổi trường có nghĩa thì đổi', () => {
    const a = base();
    const reordered = { updated_at: '2026-11-08T14:30:00+07:00', total: '090000', paid: false, lines: a.lines, buyer: { phone: '0909', name: 'Lan', id: 'b1' }, platform_status: 'READY', platform: 'shopee', external_id: 'SP-1', created_at: '2026-11-08T00:00:00Z' };
    expect(canonicalHash(reordered as never)).toBe(canonicalHash(a as never));
    expect(canonicalHash({ ...a, total: '90001' } as never)).not.toBe(canonicalHash(a as never));
  });
});
