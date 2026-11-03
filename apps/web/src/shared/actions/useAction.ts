// Đường ghi duy nhất của FE (frontend-structure §4): 202 preview → ConfirmActionHost, invalidates, toast + Hoàn tác, lỗi theo code.
// 202 approval_required (TIP-023b SPEC B.4): toast "đã gửi duyệt", `onAccepted` + `accepted` riêng, invalidate danh sách duyệt; `run` vẫn trả
// null (không giả kết quả thành công cho consumer đợi 200). Loại 202 khác (032b job_accepted) phải thêm nhánh — switch exhaustive.
'use client';
import { useCallback, useState } from 'react';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAction, requiresIdempotencyKey, type ActionAccepted, type ActionResult } from '@appchat/actions';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { matchesInvalidation } from '../api/query-keys';
import { useConfirmStore } from './confirm-store';

export interface RunOptions {
  silent?: boolean;
  /** Màn tự xử lý lỗi nghiệp vụ (vd. CONTACT_OWNED → "Xin chia sẻ"); trả true để bỏ toast lỗi chung. */
  onError?: (e: ApiRequestError) => boolean;
  /** 202 đã nhận nhưng CHƯA thực hiện (chờ duyệt) — màn tự cập nhật trạng thái chờ nếu cần. */
  onAccepted?: (a: Exclude<ActionAccepted, { status: 'preview_required' }>) => void;
}

const never = (x: never): never => {
  throw new Error(`202 chưa xử lý: ${JSON.stringify(x)}`);
};

export function useAction<O = unknown>(id: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const t = useTranslations();
  const ask = useConfirmStore((s) => s.ask);
  const [isPending, setPending] = useState(false);
  const [accepted, setAccepted] = useState<Exclude<ActionAccepted, { status: 'preview_required' }> | null>(null);

  const run = useCallback(
    async (input: unknown, opts: RunOptions = {}): Promise<ActionResult<O> | null> => {
      const def = getAction(id);
      // Một khoá mỗi lần bấm (dùng lại khi xác nhận preview) — gửi lại do mạng không tạo bản ghi thứ hai.
      const idem = def && requiresIdempotencyKey(id, def.risk) ? { idempotencyKey: crypto.randomUUID() } : {};
      setPending(true);
      setAccepted(null);
      try {
        let res = await transport.action<O>(id, input, idem);
        if (res.status === 202 && res.data.status === 'preview_required') {
          const ok = await ask(id, res.data.preview);
          if (!ok) return null;
          res = await transport.action<O>(id, input, { ...idem, confirmToken: res.data.confirm_token });
        }
        if (res.status !== 200) {
          const a = res.data;
          switch (a.status) {
            case 'preview_required':
              return null;
            case 'approval_required': {
              setAccepted(a);
              opts.onAccepted?.(a);
              await qc.invalidateQueries({ queryKey: ['approvals'] });
              if (!opts.silent && def) message.info(t('actions.approvalSent', { title: t(def.title as never) }));
              return null;
            }
            default:
              return never(a);
          }
        }
        const invalidates = def?.invalidates ?? [];
        await qc.invalidateQueries({ predicate: (q) => matchesInvalidation(invalidates, q.queryKey) });
        if (!opts.silent && def) {
          const title = t(def.title as never);
          const logId = res.data.action_log_id;
          message.open({
            type: 'success',
            key: logId,
            content: t('actions.done', { title }),
            ...(res.data.undo_until
              ? {
                  onClick: async () => {
                    await transport.undo(logId);
                    await qc.invalidateQueries({ predicate: (q) => matchesInvalidation(invalidates, q.queryKey) });
                  },
                }
              : {}),
          });
        }
        return res.data;
      } catch (e) {
        if (e instanceof ApiRequestError && opts.onError?.(e)) return null;
        const code = e instanceof ApiRequestError ? e.error.code : 'INTERNAL';
        message.error(t(`errors.${code}` as never));
        return null;
      } finally {
        setPending(false);
      }
    },
    [id, qc, message, t, ask],
  );

  return { run, isPending, accepted };
}
