// TIP-027b §2.1: schema mô tả đóng (đoạn / danh sách phẳng / chữ + đậm-nghiêng-gạch chân), giới hạn byte / nút / sâu / chữ, phép chiếu văn
// bản thuần tất định, chữ thuần cũ → tài liệu không diễn giải HTML / Markdown, dạng chuẩn gộp chữ liền kề cùng dấu.
import { describe, expect, it } from 'vitest';
import { DESCRIPTION_LIMITS, canonicalDoc, descriptionDocSchema, descriptionText, docFromPlain, type DescriptionDoc } from './description';

const doc = (content: unknown[]): unknown => ({ type: 'doc', version: 1, content });
const p = (...texts: unknown[]) => ({ type: 'paragraph', content: texts });
const t = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const ok = (d: unknown) => descriptionDocSchema.safeParse(d).success;
const msg = (d: unknown) => {
  const r = descriptionDocSchema.safeParse(d);
  return r.success ? null : r.error.issues.map((i) => i.message);
};

describe('schema đóng', () => {
  it('đủ năm định dạng: đậm / nghiêng / gạch chân / danh sách chấm / danh sách số', () => {
    const d = doc([
      p(t('Serum '), t('B5', ['bold']), t(' phục hồi', ['italic', 'underline'])),
      { type: 'bullet_list', content: [{ type: 'list_item', content: [t('Dịu da')] }, { type: 'list_item', content: [t('Cấp ẩm')] }] },
      { type: 'ordered_list', content: [{ type: 'list_item', content: [t('Rửa mặt')] }, { type: 'list_item' }] },
    ]);
    expect(ok(d)).toBe(true);
  });
  it('từ chối link / ảnh / HTML / style / thuộc tính lạ / danh sách lồng', () => {
    expect(ok(doc([{ type: 'link', href: 'https://x' }]))).toBe(false);
    expect(ok(doc([{ type: 'image', src: 'https://x/a.png' }]))).toBe(false);
    expect(ok(doc([{ type: 'html', html: '<b>x</b>' }]))).toBe(false);
    expect(ok(doc([p(t('a', ['link']))]))).toBe(false);
    expect(ok(doc([p({ ...t('a'), style: 'color:red' })]))).toBe(false);
    expect(ok(doc([{ type: 'paragraph', attrs: { class: 'x' } }]))).toBe(false);
    expect(ok(doc([{ type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'bullet_list', content: [] }] }] }]))).toBe(false);
    expect(ok({ type: 'doc', version: 2, content: [] })).toBe(false);
    expect(ok({ type: 'doc', version: 1, content: [], extra: 1 })).toBe(false);
  });
  it('dấu trùng trong một nút → duplicate_mark', () => {
    expect(msg(doc([p(t('a', ['bold', 'bold']))]))).toContain('duplicate_mark');
  });
  it('quá 4000 ký tự văn bản thuần / quá 200 nút / quá 32 KiB → từ chối', () => {
    expect(msg(doc([p(t('x'.repeat(4000))), p(t('y'))]))).toContain('text_too_long');
    const many = doc(Array.from({ length: 120 }, () => p(t('a'))));
    expect(msg(many)).toContain('too_many_nodes');
    // Trần byte là phòng thủ: 4000 ký tự × ≤ 3 byte + 200 nút có dấu < 32 KiB — tài liệu lớn nhất hợp lệ vẫn qua.
    const big = doc(Array.from({ length: 60 }, () => p(t('đ'.repeat(60), ['bold', 'italic', 'underline']))));
    expect(ok(big)).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(big)).length).toBeLessThan(DESCRIPTION_LIMITS.bytes);
  });
});

describe('phép chiếu văn bản thuần', () => {
  it('đoạn / mục mỗi cái một dòng, không thêm ký hiệu, bỏ dấu', () => {
    const d = descriptionDocSchema.parse(doc([p(t('Dòng '), t('một', ['bold'])), { type: 'ordered_list', content: [{ type: 'list_item', content: [t('A')] }, { type: 'list_item', content: [t('B')] }] }]));
    expect(descriptionText(d)).toBe('Dòng một\nA\nB');
  });
  it('chữ thuần cũ → tài liệu → chiếu lại đúng chữ; `<b>` / `**` giữ là chữ', () => {
    const raw = 'Giá <b>tốt</b>\n**không** phải markdown\n\nhết';
    const d = docFromPlain(raw);
    expect(ok(d)).toBe(true);
    expect(descriptionText(d)).toBe(raw);
    expect(JSON.stringify(d)).not.toContain('"bold"');
    expect(docFromPlain('   ').content).toEqual([]);
  });
});

describe('dạng chuẩn', () => {
  it('gộp chữ liền kề cùng dấu, sắp dấu cố định, bỏ chữ rỗng', () => {
    const d = { type: 'doc', version: 1, content: [p(t('a', ['italic', 'bold'])), p(t('b', ['bold'])), { type: 'paragraph', content: [t('x', ['bold']), t('y', ['bold']), t('z')] }] } as unknown as DescriptionDoc;
    const c = canonicalDoc(d);
    expect(c.content[0]).toEqual(p(t('a', ['bold', 'italic'])));
    expect(c.content[2]).toEqual(p(t('xy', ['bold']), t('z')));
  });
  it('tiếng Việt tổ hợp / emoji giữ nguyên từng code unit khi gộp', () => {
    const d = { type: 'doc', version: 1, content: [p(t('Tiếng Việt '), t('có dấu 👍🏽'))] } as unknown as DescriptionDoc;
    expect(descriptionText(canonicalDoc(d))).toBe('Tiếng Việt có dấu 👍🏽');
  });
});
