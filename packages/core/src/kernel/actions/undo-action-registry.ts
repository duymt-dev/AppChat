// Map action cha → action hoàn tác chuẩn (TIP-034c §3.3). Kernel trung lập: domain đăng ký lúc nạp module, kernel không import handler
// domain. UndoService tra map TRƯỚC khi chạy hoàn tác một-transaction cũ: cha có map → 409 UNDO_REQUIRES_ACTION kèm `undo_action` +
// `parent_action_log_id`, không ghi gì, không đổi trạng thái log. Client (useUndoAction) chỉ bắc cầu cho action có trong danh sách này.
const MAP = new Map<string, string>();

export function registerUndoAction(parentActionId: string, undoActionId: string): void {
  const prev = MAP.get(parentActionId);
  if (prev && prev !== undoActionId) throw new Error(`Trùng undo action: ${parentActionId}`);
  MAP.set(parentActionId, undoActionId);
}

export const undoActionOf = (parentActionId: string): string | undefined => MAP.get(parentActionId);
