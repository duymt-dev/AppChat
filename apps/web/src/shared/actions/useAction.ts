// Đường ghi duy nhất của FE (frontend-structure §4): 202 preview → ConfirmActionHost, invalidates, toast + Hoàn tác, lỗi theo code.
'use client';
import { useCallback, useState } from 'react';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { getAction, type ActionResult } from '@appchat/actions';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { matchesInvalidation } from '../api/query-keys';
import { useConfirmStore } from './confirm-store';

export interface RunOptions {
  silent?: boolean;
}

export function useAction<O = unknown>(id: string) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const t = useTranslations();
  const ask = useConfirmStore((s) => s.ask);
  const [isPending, setPending] = useState(false);

  const run = useCallback(
    async (input: unknown, opts: RunOptions = {}): Promise<ActionResult<O> | null> => {
      const def = getAction(id);
      setPending(true);
      try {
        let res = await transport.action<O>(id, input);
        if (res.status === 202 && res.data.status === 'preview_required') {
          const ok = await ask(id, res.data.preview);
          if (!ok) return null;
          res = await transport.action<O>(id, input, { confirmToken: res.data.confirm_token });
        }
        if (res.status !== 200) return null;
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
        const code = e instanceof ApiRequestError ? e.error.code : 'INTERNAL';
        message.error(t(`errors.${code}` as never));
        return null;
      } finally {
        setPending(false);
      }
    },
    [id, qc, message, t, ask],
  );

  return { run, isPending };
}
