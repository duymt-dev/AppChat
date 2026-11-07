// Đăng nhập Zalo cá nhân trong wizard (REQ-B10 bước 2, TIP-014): channel.zalo.start_login → poll trạng thái QR
// (`/settings/channels/:id/login`) → quét xong gọi `onConnected` (sang bước 3); hết hạn / từ chối → quét lại bằng channel.reconnect.
'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAction } from '@/shared/actions/useAction';
import { channelLoginQuery } from '../api';

/** `reconnectId`: tài khoản đang có (hết phiên) — bước 2 quét lại cho nó bằng channel.reconnect thay vì tạo tài khoản mới. */
export function useZaloLogin(onConnected: (accountId: string) => void, reconnectId?: string) {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState<string | null>(null);
  const start = useAction<{ channel_account_id: string; qr: string }>('channel.zalo.start_login');
  const reconnect = useAction('channel.reconnect');
  const state = useQuery({ ...channelLoginQuery(accountId ?? ''), enabled: !!accountId }).data;
  const status = accountId ? (state?.status ?? 'starting') : null;

  // Quét xong → báo một lần (ref chặn gọi lặp khi render lại), tài khoản mới hiện ở danh sách.
  const done = useRef<string | null>(null);
  useEffect(() => {
    if (!accountId || status !== 'connected' || done.current === accountId) return;
    done.current = accountId;
    void qc.invalidateQueries({ queryKey: ['channels'] });
    onConnected(accountId);
  }, [accountId, status, onConnected, qc]);

  const failed = status === 'expired' || status === 'declined' || status === 'failed';

  const begin = async (label: string) => {
    const target = accountId ?? reconnectId;
    if (target && (failed || !accountId)) {
      if (await reconnect.run({ channel_account_id: target })) {
        await qc.resetQueries({ queryKey: ['channels', 'settings', 'login', target] });
        done.current = null;
        setAccountId(target);
      }
      return;
    }
    const r = await start.run(label ? { label } : {});
    if (r) {
      done.current = null;
      setAccountId(r.result.channel_account_id);
    }
  };

  return {
    begin,
    reset: () => {
      done.current = null;
      setAccountId(null);
    },
    status,
    qr: status === 'waiting' ? (state?.qr ?? null) : null,
    failed,
    /** Đang chờ quét (không cho bấm Tiếp tục lần nữa). */
    busy: start.isPending || reconnect.isPending || (!!accountId && !failed && status !== 'connected'),
  };
}
