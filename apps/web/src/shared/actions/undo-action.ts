// Cầu nối hoàn tác (TIP-034c §3.4): POST /action-logs/:id/undo; CHỈ bắt đúng 409 UNDO_REQUIRES_ACTION có `undo_action` nằm trong danh sách
// cho phép + `parent_action_log_id` khớp log đang hoàn tác → chạy action hoàn tác chuẩn qua CÙNG đường xem trước / xác nhận như useAction
// (runActionRequest). Mã khác / action lạ / log lệch → lỗi như cũ, không bao giờ báo "đã hoàn tác" khi server chỉ trả yêu cầu action.
import { ApiRequestError } from '@appchat/shared';
import { getAction, type ActionAccepted, type ActionResult } from '@appchat/actions';
import { transport } from '../api/client';
import { runActionRequest, type RequestOptions } from './run-action-request';

/** Cha có action hoàn tác riêng (khớp kernel/actions/undo-action-registry phía server). */
export const UNDO_ACTIONS: Readonly<Record<string, string>> = { 'ticket.bulk_update': 'ticket.bulk_undo' };

export type UndoOutcome =
  /** Hoàn tác thường (một transaction) xong. */
  | { kind: 'undone' }
  /** Hoàn tác qua action chuẩn: 200 (kết quả từng bản ghi — có thể một phần) hoặc 202 (việc nền đang chạy). */
  | {
      kind: 'action';
      actionId: string;
      result: ActionResult<unknown> | null;
      accepted: Exclude<ActionAccepted, { status: 'preview_required' }> | null;
    }
  /** Người dùng huỷ ở bước xem trước. */
  | { kind: 'cancelled' };

/** Lỗi 409 có đúng là yêu cầu chạy action hoàn tác hợp lệ cho log này? Trả action id hoặc null. */
export function bridgeTarget(e: unknown, logId: string, parentActionId?: string): string | null {
  if (!(e instanceof ApiRequestError) || e.status !== 409 || e.error.code !== 'UNDO_REQUIRES_ACTION')
    return null;
  const f = e.error.fields ?? {};
  const target = f.undo_action;
  if (
    !target ||
    f.parent_action_log_id !== logId ||
    !Object.values(UNDO_ACTIONS).includes(target) ||
    !getAction(target)
  )
    return null;
  // Biết action gốc (toast / nhật ký) → phải đúng cặp đã đăng ký.
  if (parentActionId && UNDO_ACTIONS[parentActionId] !== target) return null;
  return target;
}

export async function undoLog(
  logId: string,
  o: RequestOptions & { parentActionId?: string },
): Promise<UndoOutcome> {
  try {
    await transport.undo(logId);
    return { kind: 'undone' };
  } catch (e) {
    const target = bridgeTarget(e, logId, o.parentActionId);
    if (!target) throw e;
    const res = await runActionRequest(target, { parent_action_log_id: logId }, o);
    if (!res) return { kind: 'cancelled' };
    if (res.status === 200) return { kind: 'action', actionId: target, result: res.data, accepted: null };
    if (res.data.status === 'preview_required') return { kind: 'cancelled' };
    return { kind: 'action', actionId: target, result: null, accepted: res.data };
  }
}
