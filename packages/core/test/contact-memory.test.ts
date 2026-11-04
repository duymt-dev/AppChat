// TIP-015b trí nhớ khách (xác định, không DB): chuẩn hoá fact, chặn dữ liệu nhạy cảm, kiểm input, thứ tự bỏ fact khi đầy, tool `remember`
// của agent trực kênh gắn khách phía server. Luồng DB (khoá, trần 50 đồng thời, gộp / hoàn tác, quét biên nhận): apps/api/test/integration/contact-memory.test.ts.
import { describe, expect, it } from 'vitest';
import { MEMORY_CAP, checkFact, cleanFact, evictionOrder, normFact, sensitive } from '../src/crm/memory/normalize';

describe('trí nhớ khách: chuẩn hoá + kiểm', () => {
  it('normFact bỏ dấu, thường, gộp khoảng trắng / dấu câu — câu chỉ khác dấu / hoa thường trùng nhau', () => {
    expect(normFact('Em  DỊ ỨNG tinh dầu sả!!')).toBe('em di ung tinh dau sa');
    expect(normFact('em dị ứng, tinh dầu sả')).toBe(normFact('Em dị ứng tinh-dầu sả.'));
    expect(cleanFact(`  a\n\tb  ${'x'.repeat(2000)}`)).toHaveLength(1000);
  });

  it('chặn CCCD / CMND, số thẻ (Luhn), mật khẩu / OTP; SĐT và số thường không bị chặn', () => {
    expect(sensitive('CCCD của chị là 079123456789')).toBe('id_number');
    expect(sensitive('số 079123456789')).toBe('id_number');
    expect(sensitive('thẻ 4111 1111 1111 1111')).toBe('card_number');
    expect(sensitive('mật khẩu app là abc123')).toBe('secret');
    expect(sensitive('mã OTP 123456')).toBe('secret');
    expect(sensitive('SĐT phụ 0909123456')).toBeNull();
    expect(sensitive('thích liệu trình 10 buổi, ngân sách 5000000')).toBeNull();
    expect(sensitive('em dị ứng tinh dầu sả')).toBeNull();
  });

  it('checkFact: rỗng → fact:required · confidence ngoài 0..1 / NaN → confidence:invalid · nhạy cảm → fact:sensitive:*', () => {
    expect(() => checkFact('  ', 1)).toThrow(expect.objectContaining({ fields: { fact: 'required' } }));
    expect(() => checkFact('!!!', 1)).toThrow(expect.objectContaining({ fields: { fact: 'required' } }));
    for (const c of [-0.1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => checkFact('thích trà', c)).toThrow(expect.objectContaining({ fields: { confidence: 'invalid' } }));
    expect(() => checkFact('pass wifi nhà là 1234', 1)).toThrow(expect.objectContaining({ httpStatus: 422, fields: { fact: 'sensitive:secret' } }));
    expect(checkFact(' Thích  trà ', undefined)).toEqual({ fact: 'Thích trà', norm: 'thich tra', confidence: 1 });
  });

  it('evictionOrder: tin cậy thấp nhất → cập nhật cũ nhất → id nhỏ nhất (tất định)', () => {
    const t = (s: number) => new Date(Date.UTC(2026, 10, 1, 0, 0, s));
    const rows = [
      { id: 'c', confidence: 0.5, updatedAt: t(1) },
      { id: 'b', confidence: 0.5, updatedAt: t(1) },
      { id: 'a', confidence: 0.9, updatedAt: t(0) },
      { id: 'd', confidence: 0.5, updatedAt: t(0) },
      { id: 'e', confidence: 0.2, updatedAt: t(9) },
    ];
    expect(evictionOrder(rows).map((r) => r.id)).toEqual(['e', 'd', 'b', 'c', 'a']);
    expect(rows.map((r) => r.id)).toEqual(['c', 'b', 'a', 'd', 'e']);
    expect(MEMORY_CAP).toBe(50);
  });
});
