// Trạng thái trình soạn mô tả (TIP-027b §2.4): tài liệu có cấu trúc (dòng + run) là nguồn sự thật — DOM chỉ là hình chiếu, không đọc
// innerHTML để lưu. Thao tác qua mô hình thuần (description-selection) + lịch sử 50 bước. `doc` / `text` trả cho form để gửi
// `description_doc` + `description` khớp phép chiếu (server so lại). Tài liệu rỗng → null (xoá định dạng).
'use client';
import { useCallback, useMemo, useState } from 'react';
import { descriptionText, type DescriptionDoc, type DescriptionMark } from '@appchat/shared';
import { deleteAt, docOf, hasMark, insertText, lineText, linesOf, listKind, toggleList, toggleMark, type Line, type Pos, type Sel } from './description-selection';
import { emptyHistory, record, redo as redoStep, undo as undoStep, type History } from './description-history';

const at = (p: Pos): Sel => ({ anchor: p, focus: p });

export function useProductDescription(init: { doc?: DescriptionDoc | null; plain?: string }) {
  const [state, setState] = useState(() => {
    const lines = linesOf(init.doc, init.plain);
    const last = lines.length - 1;
    return { lines, sel: at({ line: last, offset: lineText(lines[last]!).length }), h: emptyHistory() as History, dirty: false };
  });

  const apply = useCallback((fn: (lines: Line[], sel: Sel) => { lines: Line[]; sel: Sel }) => {
    setState((s) => {
      const r = fn(s.lines, s.sel);
      if (r.lines === s.lines) return { ...s, sel: r.sel };
      return { lines: r.lines, sel: r.sel, h: record(s.h, { lines: s.lines, sel: s.sel }), dirty: true };
    });
  }, []);

  const setSel = useCallback((sel: Sel) => setState((s) => ({ ...s, sel })), []);
  const type = useCallback((text: string) => apply((l, s) => ((r) => ({ lines: r.lines, sel: at(r.caret) }))(insertText(l, s, text))), [apply]);
  const remove = useCallback((dir: 'back' | 'forward') => apply((l, s) => ((r) => ({ lines: r.lines, sel: at(r.caret) }))(deleteAt(l, s, dir))), [apply]);
  const mark = useCallback((m: DescriptionMark) => apply((l, s) => ({ lines: toggleMark(l, s, m), sel: s })), [apply]);
  const list = useCallback((k: 'bullet' | 'ordered') => apply((l, s) => ({ lines: toggleList(l, s, k), sel: s })), [apply]);
  const undo = useCallback(() => setState((s) => ((r) => (r ? { lines: r.snap.lines, sel: r.snap.sel, h: r.h, dirty: true } : s))(undoStep(s.h, { lines: s.lines, sel: s.sel }))), []);
  const redo = useCallback(() => setState((s) => ((r) => (r ? { lines: r.snap.lines, sel: r.snap.sel, h: r.h, dirty: true } : s))(redoStep(s.h, { lines: s.lines, sel: s.sel }))), []);

  const doc = useMemo(() => docOf(state.lines), [state.lines]);
  const text = useMemo(() => descriptionText(doc), [doc]);
  return {
    lines: state.lines,
    sel: state.sel,
    dirty: state.dirty,
    setSel,
    type,
    remove,
    mark,
    list,
    undo,
    redo,
    canUndo: state.h.past.length > 0,
    canRedo: state.h.future.length > 0,
    active: (m: DescriptionMark) => hasMark(state.lines, state.sel, m),
    kind: listKind(state.lines, state.sel),
    /** Gửi kèm product.create / update: tài liệu rỗng → null (xoá cả hai ở server). */
    value: text ? { description: text, description_doc: doc } : { description: '', description_doc: null },
  };
}

export type DescriptionEditorApi = ReturnType<typeof useProductDescription>;
