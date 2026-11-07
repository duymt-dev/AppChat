// TIP-025b §B.3 — foldRanges: so khớp không dấu, vị trí trả về là UTF-16 trên chuỗi GỐC (dựng sẵn NFC, tổ hợp NFD, đ/Đ, emoji cặp thay
// thế, chữ hoa) — cắt chuỗi gốc theo range ra đúng phần người dùng thấy khớp.
import { describe, expect, it } from 'vitest';
import { foldRanges, foldWithMap } from '../src/api/inbox-thread';

const cut = (s: string, r: [number, number][]) => r.map(([a, b]) => s.slice(a, b));

describe('foldRanges', () => {
  it('NFC + NFD + chữ hoa đều khớp và cắt đúng chuỗi gốc', () => {
    const nfc = 'Báo giá triệt lông';
    const nfd = nfc.normalize('NFD');
    expect(cut(nfc, foldRanges(nfc, 'triet long'))).toEqual(['triệt lông']);
    expect(cut(nfd, foldRanges(nfd, 'triet long')).map((x) => x.normalize('NFC'))).toEqual(['triệt lông']);
    expect(cut('GIÁ TRIỆT LÔNG', foldRanges('GIÁ TRIỆT LÔNG', 'triệt lông'))).toEqual(['TRIỆT LÔNG']);
  });

  it('emoji trước chỗ khớp không lệch vị trí; đ/Đ gấp về d', () => {
    const s = '😀😀 Đặt lịch 🎉 đặt lại';
    expect(cut(s, foldRanges(s, 'dat'))).toEqual(['Đặt', 'đặt']);
  });

  it('nhiều lần khớp, câu rỗng → []', () => {
    expect(foldRanges('gia gia gia', 'gia')).toHaveLength(3);
    expect(foldRanges('abc', '   ')).toEqual([]);
  });

  it('map dài hơn chuỗi gấp đúng 1 (mốc cuối = độ dài gốc)', () => {
    const s = 'Ấn 😀';
    const { folded, map } = foldWithMap(s);
    expect(map).toHaveLength(folded.length + 1);
    expect(map.at(-1)).toBe(s.length);
  });
});
