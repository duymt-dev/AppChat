// Hoàn tác dùng chung cho toast "Hoàn tác" (useAction) và Nhật ký hành động (TIP-034c §3.4): undoLog bắc cầu 409 UNDO_REQUIRES_ACTION
// sang action hoàn tác chuẩn (xem trước + xác nhận như mọi action). Chỉ báo "đã hoàn tác" khi hoàn tác thật xong TOÀN BỘ; một phần /
// xung đột / đang chạy nền → báo đúng trạng thái đó (kết quả từng bản ghi ở màn của module), không giả thành công.
'use client';
import { useCallback } from 'react';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAction } from '@appchat/actions';
import { ApiRequestError } from '@appchat/shared';
import { matchesInvalidation } from '../api/query-keys';
import { useConfirmStore } from './confirm-store';
import { undoLog, type UndoOutcome } from './undo-action';

type Counts = { undone?: number; failed?: number };
type Message = ReturnType<typeof App.useApp>['message'];

/** Toast kết quả hoàn tác qua action chuẩn — dùng chung với nút Hoàn tác của màn module (TicketBulkResults). */
export function toastUndo(
  message: Message,
  t: (k: string, v?: Record<string, string | number>) => string,
  title: string,
  r: Counts | null,
  accepted: boolean,
) {
  if (accepted) return void message.info(t('actions.undoAccepted', { title }));
  if (!r?.failed) return void message.success(t('actions.undone', { title }));
  message.warning(t('actions.undoPartial', { title, undone: r.undone ?? 0, failed: r.failed }));
}

export function useUndoAction() {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const t = useTranslations();
  const ask = useConfirmStore((s) => s.ask);

  /** Trả kết cục (màn tự cập nhật thêm nếu cần) hoặc null khi lỗi (đã toast mã lỗi). */
  return useCallback(
    async (logId: string, parentActionId: string | undefined, title: string): Promise<UndoOutcome | null> => {
      let out: UndoOutcome;
      try {
        out = await undoLog(logId, { ask, ...(parentActionId ? { parentActionId } : {}) });
      } catch (e) {
        message.error(t(`errors.${e instanceof ApiRequestError ? e.error.code : 'INTERNAL'}` as never));
        return null;
      }
      const inv = [
        ...(getAction(parentActionId ?? '')?.invalidates ?? []),
        ...(out.kind === 'action' ? (getAction(out.actionId)?.invalidates ?? []) : []),
      ];
      await qc.invalidateQueries({
        predicate: (q) => q.queryKey[0] === 'action-logs' || matchesInvalidation(inv, q.queryKey),
      });
      if (out.kind === 'undone') message.success(t('actions.undone', { title }));
      if (out.kind === 'action')
        toastUndo(message, t as never, title, (out.result?.result ?? null) as Counts | null, !!out.accepted);
      return out;
    },
    [ask, message, qc, t],
  );
}
