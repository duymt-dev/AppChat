// Đường ghi duy nhất của FE (frontend-structure §4): 202 preview → ConfirmActionHost, invalidates, toast + Hoàn tác, lỗi theo code.
// 202 approval_required (TIP-023b SPEC B.4): toast "đã gửi duyệt", `onAccepted` + `accepted` riêng, invalidate danh sách duyệt; `run` vẫn trả
// null (không giả kết quả thành công cho consumer đợi 200). 202 job_accepted (TIP-032b): việc nền đã nhận — toast "đang chạy" (không phải
// "đã xong"), `onAccepted` + `accepted` giữ handle (job_id, status_url) để màn theo dõi; không invalidate như hoàn tất. Switch exhaustive.
// 402 CREDIT_EXHAUSTED (TIP-039) → thêm popup ví toàn app.
// GenUI (TIP-023c): `genui.intent` = handle server ký cho node → header `x-genui-intent` (server đặt nguồn assistant → xem trước / xác
// nhận như Trợ lý). Form có ô bí mật: 202 trả `secret_vault`; lần xác nhận gửi vault + input ĐÃ BỎ ô bí mật (không gửi lại giá trị).
'use client';
import { useCallback, useState } from 'react';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { REQUESTABLE_PREVIEW_ACTIONS, getAction, requiresIdempotencyKey, type ActionAccepted, type ActionResult } from '@appchat/actions';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { matchesInvalidation } from '../api/query-keys';
import { useConfirmStore } from './confirm-store';
import { creditExhausted } from '../billing/credit-error';

export interface RunOptions {
  silent?: boolean;
  /** Màn tự xử lý lỗi nghiệp vụ (vd. CONTACT_OWNED → "Xin chia sẻ"); trả true để bỏ toast lỗi chung. */
  onError?: (e: ApiRequestError) => boolean;
  /** 202 đã nhận nhưng CHƯA xong (chờ duyệt / việc nền đang chạy) — màn giữ handle / cập nhật trạng thái chờ. */
  onAccepted?: (a: Exclude<ActionAccepted, { status: 'preview_required' }>) => void;
  /** Gửi từ node GenUI: handle intent + đường dẫn ô bí mật của form (bỏ khỏi input ở lần xác nhận). */
  genui?: { intent: string; secretPaths?: string[] };
}

/** Bản sao input không có các ô bí mật (`fields.password`). */
export function withoutPaths(input: unknown, paths: string[]): unknown {
  if (!paths.length || !input || typeof input !== 'object') return input;
  const out = structuredClone(input) as Record<string, unknown>;
  for (const p of paths) {
    const keys = p.split('.');
    const parent = keys.slice(0, -1).reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), out);
    if (parent && typeof parent === 'object') delete (parent as Record<string, unknown>)[keys.at(-1)!];
  }
  return out;
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
      const idem = {
        ...(def && requiresIdempotencyKey(id, def.risk) ? { idempotencyKey: crypto.randomUUID() } : {}),
        ...(opts.genui ? { genuiIntent: opts.genui.intent } : {}),
      };
      setPending(true);
      setAccepted(null);
      try {
        // TIP-028b: gửi / duyệt chứng từ → xin xem trước để ConfirmActionHost hiện bảng kiểm pháp lý (cảnh báo, không chặn).
        let res = await transport.action<O>(id, input, { ...idem, ...(REQUESTABLE_PREVIEW_ACTIONS.has(id) ? { preview: true } : {}) });
        if (res.status === 202 && res.data.status === 'preview_required') {
          const ok = await ask(id, res.data.preview);
          if (!ok) return null;
          const vault = (res.data as { secret_vault?: string }).secret_vault;
          res = vault
            ? await transport.action<O>(id, withoutPaths(input, opts.genui?.secretPaths ?? []), { ...idem, confirmToken: res.data.confirm_token, secretVault: vault })
            : await transport.action<O>(id, input, { ...idem, confirmToken: res.data.confirm_token });
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
            case 'job_accepted': {
              setAccepted(a);
              opts.onAccepted?.(a);
              if (!opts.silent && def) message.info(t('actions.jobAccepted', { title: t(def.title as never) }));
              return null;
            }
            case 'operation_pending': {
              // TIP-045b: đã ghi ở nền tảng, phần workspace đang hoàn tất — không báo thành công, không bấm lại (gửi lại cùng khoá an toàn).
              setAccepted(a);
              opts.onAccepted?.(a);
              if (!opts.silent && def) message.info(t('actions.operationPending', { title: t(def.title as never) }));
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
        // TIP-039: 402 hết Credit → popup ví (BillingNoticeHost) ngoài toast; PLAN_LIMIT_REACHED giữ toast riêng (không gắn nhãn hết Credit).
        if (code === 'CREDIT_EXHAUSTED') creditExhausted();
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
