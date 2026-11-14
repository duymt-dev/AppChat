// TIP-027b §2.4 — mô hình soạn mô tả thuần: dấu bật / tắt trên vùng chọn, không tách grapheme (cặp surrogate, dấu kết hợp tiếng Việt),
// danh sách theo dòng chạm vùng chọn, chèn chữ thuần (chữ `<b>` giữ nguyên), xoá / nối dòng, khứ hồi tài liệu chuẩn, lịch sử ≤ 50 bước.
import { describe, expect, it } from 'vitest';
import { descriptionDocSchema, descriptionText, type DescriptionDoc } from '@appchat/shared';
import { deleteAt, docOf, hasMark, insertText, linesOf, listKind, snap, toggleList, toggleMark, type Sel } from './description-selection';
import { HISTORY_LIMIT, emptyHistory, record, redo, undo } from './description-history';

const sel = (l1: number, o1: number, l2 = l1, o2 = o1): Sel => ({ anchor: { line: l1, offset: o1 }, focus: { line: l2, offset: o2 } });

describe('description-selection', () => {
  it('sản phẩm cũ: chữ thuần → một đoạn mỗi dòng, chữ HTML / Markdown là chữ', () => {
    const lines = linesOf(null, '<b>x</b>\n**y**');
    expect(lines.map((l) => [l.kind, l.runs[0]?.text, l.runs[0]?.marks])).toEqual([
      ['paragraph', '<b>x</b>', []],
      ['paragraph', '**y**', []],
    ]);
    expect(descriptionText(docOf(lines))).toBe('<b>x</b>\n**y**');
  });

  it('đậm một phần rồi tắt lại; nút hiện trạng thái theo vùng chọn', () => {
    let lines = linesOf(null, 'Serum dưỡng ẩm');
    lines = toggleMark(lines, sel(0, 0, 0, 5), 'bold');
    expect(lines[0]!.runs).toEqual([
      { text: 'Serum', marks: ['bold'] },
      { text: ' dưỡng ẩm', marks: [] },
    ]);
    expect(hasMark(lines, sel(0, 0, 0, 5), 'bold')).toBe(true);
    expect(hasMark(lines, sel(0, 0, 0, 8), 'bold')).toBe(false);
    lines = toggleMark(lines, sel(0, 5, 0, 0), 'bold');
    expect(lines[0]!.runs).toEqual([{ text: 'Serum dưỡng ẩm', marks: [] }]);
  });

  it('không tách grapheme: emoji (surrogate) và chữ có dấu kết hợp', () => {
    const t = 'a😀b';
    expect(snap(t, 2)).toBe(1);
    const lines = toggleMark(linesOf(null, t), sel(0, 0, 0, 2), 'italic');
    expect(lines[0]!.runs.map((r) => r.text)).toEqual(['a', '😀b']);
    const combining = 'éx';
    expect(snap(combining, 1)).toBe(0);
    const back = deleteAt(linesOf(null, combining), sel(0, 2), 'back');
    expect(back.lines[0]!.runs[0]!.text).toBe('x');
    expect(back.caret).toEqual({ line: 0, offset: 0 });
  });

  it('danh sách chấm / số theo dòng; bấm lại trở về đoạn; mục kề cùng loại gộp một danh sách', () => {
    let lines = linesOf(null, 'Một\nHai\nBa');
    lines = toggleList(lines, sel(0, 0, 1, 1), 'bullet');
    expect(listKind(lines, sel(0, 0, 1, 0))).toBe('bullet');
    const doc = docOf(lines);
    expect(doc.content.map((b) => b.type)).toEqual(['bullet_list', 'paragraph']);
    lines = toggleList(lines, sel(2, 0), 'ordered');
    expect(docOf(lines).content.map((b) => b.type)).toEqual(['bullet_list', 'ordered_list']);
    lines = toggleList(lines, sel(0, 0, 1, 0), 'bullet');
    expect(listKind(lines, sel(0, 0))).toBe('paragraph');
  });

  it('chèn chữ: kế thừa dấu trước con trỏ, xuống dòng tách dòng cùng loại, thay vùng chọn', () => {
    let lines = toggleMark(linesOf(null, 'ab'), sel(0, 0, 0, 2), 'bold');
    const r = insertText(lines, sel(0, 2), 'c\n<i>');
    expect(r.lines.map((l) => l.runs)).toEqual([[{ text: 'abc', marks: ['bold'] }], [{ text: '<i>', marks: ['bold'] }]]);
    expect(r.caret).toEqual({ line: 1, offset: 3 });
    lines = insertText(linesOf(null, 'Xin chào'), sel(0, 0, 0, 3), 'Kính').lines;
    expect(descriptionText(docOf(lines))).toBe('Kính chào');
  });

  it('xoá lùi đầu dòng nối dòng trên; xoá tiến cuối dòng nối dòng dưới', () => {
    const lines = linesOf(null, 'ab\ncd');
    expect(descriptionText(docOf(deleteAt(lines, sel(1, 0), 'back').lines))).toBe('abcd');
    expect(descriptionText(docOf(deleteAt(lines, sel(0, 2), 'forward').lines))).toBe('abcd');
    expect(deleteAt(lines, sel(0, 0), 'back').lines).toBe(lines);
  });

  it('khứ hồi: tài liệu → dòng → tài liệu dạng chuẩn, hợp lệ theo schema shared', () => {
    const doc: DescriptionDoc = {
      type: 'doc',
      version: 1,
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Đậm', marks: ['bold'] }, { type: 'text', text: ' thường' }] },
        { type: 'bullet_list', content: [{ type: 'list_item', content: [{ type: 'text', text: 'A', marks: ['italic', 'underline'] }] }, { type: 'list_item' }] },
        { type: 'ordered_list', content: [{ type: 'list_item', content: [{ type: 'text', text: '1' }] }] },
      ],
    };
    const back = docOf(linesOf(doc));
    expect(back).toEqual(doc);
    expect(descriptionDocSchema.safeParse(back).success).toBe(true);
  });
});

describe('description-history', () => {
  it('giới hạn 50 bước; undo / redo đổi chỗ trạng thái', () => {
    let h = emptyHistory();
    for (let n = 0; n < HISTORY_LIMIT + 5; n++) h = record(h, { lines: linesOf(null, String(n)), sel: sel(0, 0) });
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    const cur = { lines: linesOf(null, 'now'), sel: sel(0, 3) };
    const u = undo(h, cur)!;
    expect(descriptionText(docOf(u.snap.lines))).toBe(String(HISTORY_LIMIT + 4));
    const r = redo(u.h, u.snap)!;
    expect(descriptionText(docOf(r.snap.lines))).toBe('now');
    expect(undo(emptyHistory(), cur)).toBeNull();
  });
});
