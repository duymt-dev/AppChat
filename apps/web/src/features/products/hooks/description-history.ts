// Lịch sử hoàn tác cục bộ của trình soạn mô tả (TIP-027b §2.4): tối đa 50 bước, chỉ trong phiên soạn (không lưu server). Thao tác mới sau
// khi hoàn tác xoá nhánh làm lại. Mỗi bước giữ dòng + vùng chọn để hoàn tác trả con trỏ về đúng chỗ.
import type { Line, Sel } from './description-selection';

export const HISTORY_LIMIT = 50;

export interface Snapshot {
  lines: Line[];
  sel: Sel;
}

export interface History {
  past: Snapshot[];
  future: Snapshot[];
}

export const emptyHistory = (): History => ({ past: [], future: [] });

/** Ghi trạng thái TRƯỚC thao tác; giữ ≤ 50 bước. */
export const record = (h: History, before: Snapshot): History => ({ past: [...h.past, before].slice(-HISTORY_LIMIT), future: [] });

export function undo(h: History, current: Snapshot): { h: History; snap: Snapshot } | null {
  const prev = h.past.at(-1);
  if (!prev) return null;
  return { h: { past: h.past.slice(0, -1), future: [current, ...h.future].slice(0, HISTORY_LIMIT) }, snap: prev };
}

export function redo(h: History, current: Snapshot): { h: History; snap: Snapshot } | null {
  const next = h.future[0];
  if (!next) return null;
  return { h: { past: [...h.past, current].slice(-HISTORY_LIMIT), future: h.future.slice(1) }, snap: next };
}
