// TIP-033c §2.2: khối `appointment_order` trong cây GenUI đóng — chỉ id lịch (+ hội thoại); mọi ô khác (giá, tổng, quyền, điều kiện, URL,
// action) bị chặn; id dạng lạ (khoảng trắng, đường dẫn, quá dài) bị chặn; khối không mang `$ref` (không nhận dữ liệu từ bước model).
import { describe, expect, it } from 'vitest';
import { checkTree, refsOf, type UiBlock } from './index';

const tree = (root: unknown) => ({ version: 1, root });
const ok = (root: unknown) => checkTree(tree(root)).ok;
const A = '0190f000-0000-7000-8000-000000000031';

describe('khối appointment_order', () => {
  it('nhận id lịch, tuỳ chọn hội thoại, lồng trong stack', () => {
    expect(ok({ type: 'appointment_order', appointment_id: A })).toBe(true);
    expect(ok({ type: 'appointment_order', appointment_id: A, conversation_id: A })).toBe(true);
    expect(ok({ type: 'stack', children: [{ type: 'text', text: 'Buổi vừa xong' }, { type: 'appointment_order', appointment_id: 'ap_1202' }] })).toBe(true);
  });

  it.each([
    ['giá do model đưa', { unit_price: '1' }],
    ['tổng do model đưa', { total: '1' }],
    ['quyền / điều kiện do model đưa', { can_create: true }],
    ['actor', { actor: 'u1' }],
    ['url', { url: 'https://x.vn' }],
    ['action', { action_id: 'order.create_from_appointment' }],
  ])('chặn ô lạ: %s', (_n, extra) => {
    expect(ok({ type: 'appointment_order', appointment_id: A, ...extra })).toBe(false);
  });

  it('chặn id dạng lạ / thiếu id', () => {
    for (const id of ['', 'a b', '../x', 'x'.repeat(65), '<script>']) expect(ok({ type: 'appointment_order', appointment_id: id })).toBe(false);
    expect(ok({ type: 'appointment_order' })).toBe(false);
  });

  it('không có $ref (dữ liệu thẻ đọc lại phía server, không từ bước của model)', () => {
    const b: UiBlock = { type: 'appointment_order', appointment_id: A };
    expect(refsOf(b)).toEqual([]);
  });
});
