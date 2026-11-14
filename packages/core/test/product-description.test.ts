// TIP-027b §2.2-2.3 (thuần, không DB): chuẩn hoá mô tả sản phẩm — ma trận tương thích client cũ / mới: có tài liệu → chữ thuần dẫn ra, kèm
// chữ thuần lệch → 422; chỉ chữ thuần trùng chữ hiện có → giữ định dạng; khác → một đoạn mỗi dòng (reset có chủ đích); rỗng / null → xoá;
// không gửi → giữ nguyên. HTML / Markdown trong chữ là chữ. Tài liệu sai schema → 422 có lý do. Đọc: cột hỏng / null → không bịa định dạng.
import { describe, expect, it } from 'vitest';
import { TenantSql } from '@appchat/db';
import { formattingReset, normalizeDescription, parseDoc, currentDoc } from '../src/catalog/description/normalize';
import { docOf } from '../src/catalog/description/view';

type Thrown = { httpStatus?: number; fields?: unknown };
const err = (fn: () => unknown) => {
  try {
    fn();
    return null;
  } catch (e) {
    return { status: (e as Thrown).httpStatus, fields: (e as Thrown).fields };
  }
};
const doc = (...blocks: unknown[]) => ({ type: 'doc', version: 1, content: blocks });
const para = (...t: unknown[]) => ({ type: 'paragraph', content: t });
const txt = (text: string, marks?: string[]) => ({ type: 'text', text, ...(marks ? { marks } : {}) });
const formatted = doc(para(txt('Serum '), txt('B5', ['bold'])), { type: 'bullet_list', content: [{ type: 'list_item', content: [txt('Dịu da')] }] });
const cur = { description: 'Serum B5\nDịu da', descriptionDoc: formatted };

describe('normalizeDescription', () => {
  it('chỉ tài liệu → chữ thuần dẫn ra + tài liệu dạng chuẩn', () => {
    const r = normalizeDescription({ description_doc: formatted }, null);
    expect(r.description).toBe('Serum B5\nDịu da');
    expect(r.descriptionDoc).toMatchObject({ type: 'doc', version: 1 });
  });
  it('tài liệu + chữ thuần khớp phép chiếu → nhận; lệch → 422 mismatch_doc (không tin chữ model đưa)', () => {
    expect(normalizeDescription({ description: ' Serum B5\nDịu da ', description_doc: formatted }, null).description).toBe('Serum B5\nDịu da');
    expect(err(() => normalizeDescription({ description: 'Chữ khác', description_doc: formatted }, null))).toEqual({ status: 422, fields: { description: 'mismatch_doc' } });
  });
  it('client cũ gửi lại đúng chữ đang hiển thị → giữ định dạng (không ghi gì)', () => {
    expect(normalizeDescription({ description: 'Serum B5\nDịu da' }, cur)).toEqual({});
  });
  it('client cũ đổi chữ → một đoạn mỗi dòng (định dạng reset có chủ đích) + cờ cảnh báo nhập', () => {
    const r = normalizeDescription({ description: 'Serum mới\ndòng 2' }, cur);
    expect(r.description).toBe('Serum mới\ndòng 2');
    expect(JSON.stringify(r.descriptionDoc)).not.toContain('bold');
    expect(formattingReset('Serum mới', cur)).toBe(true);
    expect(formattingReset('Serum B5\nDịu da', cur)).toBe(false);
    expect(formattingReset('x', { description: 'x', descriptionDoc: null })).toBe(false);
  });
  it('rỗng / null → xoá cả hai; không gửi → giữ nguyên', () => {
    expect(normalizeDescription({ description: '  ' }, cur)).toEqual({ description: '', descriptionDoc: TenantSql.DbNull });
    expect(normalizeDescription({ description_doc: null }, cur)).toEqual({ description: '', descriptionDoc: TenantSql.DbNull });
    expect(normalizeDescription({ description_doc: doc() }, cur)).toEqual({ description: '', descriptionDoc: TenantSql.DbNull });
    expect(normalizeDescription({}, cur)).toEqual({});
  });
  it('HTML / Markdown trong chữ thuần là chữ — không thành định dạng', () => {
    const r = normalizeDescription({ description: '<b>đậm</b> **x**' }, null);
    expect(r.description).toBe('<b>đậm</b> **x**');
    expect(JSON.stringify(r.descriptionDoc)).toContain('<b>đậm</b> **x**');
    expect(JSON.stringify(r.descriptionDoc)).not.toContain('"marks"');
  });
  it('tài liệu sai schema → 422 có lý do (link / HTML / lồng / quá dài)', () => {
    expect(err(() => parseDoc(doc({ type: 'html', html: '<script>' }))))?.toMatchObject({ status: 422 });
    expect(err(() => parseDoc(doc(para(txt('x'.repeat(4001)))))))?.toMatchObject({ status: 422 });
    expect(err(() => parseDoc(doc(para(txt('a', ['bold', 'bold'])))))).toEqual({ status: 422, fields: { description_doc: 'duplicate_mark' } });
  });
});

describe('đọc', () => {
  it('cột null / hỏng → không có description_doc; hợp lệ → có', () => {
    expect(docOf(null)).toEqual({});
    expect(docOf({ type: 'doc', version: 9 })).toEqual({});
    expect(docOf(formatted).description_doc?.content).toHaveLength(2);
  });
  it('currentDoc: sản phẩm cũ (null) đọc như đoạn từ chữ thuần, không viết lại', () => {
    expect(currentDoc({ description: 'a\nb', descriptionDoc: null }).content).toHaveLength(2);
    expect(currentDoc(cur).content[0]).toMatchObject({ type: 'paragraph' });
  });
});
