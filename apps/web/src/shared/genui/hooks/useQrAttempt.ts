// Vòng đời khối `qr` (TIP-023c hợp đồng 1–2, standard §2): poll `channel.status` mỗi 2 giây CHỈ khi khối đang hiện + tab đang mở + lần
// hiện hành chưa kết thúc; dừng khi unmount / kết thúc. Ảnh QR lấy từ `qr_ref` (GET có auth, đúng attempt) — không qua model / lịch sử.
// Chuyển sang `connected` TRONG lần mount này → gửi `assistant.resume` một lần (server kiểm tài khoản / attempt / người / run, biên nhận
// duy nhất); mở lại phiên cũ thấy đã connected thì không resume lại. Hết hạn → tạo mã mới bằng `channel.reconnect` cùng tài khoản.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChannelStatusDto } from '@appchat/shared';
import { transport } from '../../api/client';

export const QR_POLL_MS = 2000;

export type QrLogin = NonNullable<ChannelStatusDto['login']>;

export interface QrState {
  accountId: string | null;
  login: QrLogin | null;
  png: string | null;
}

/** Giá trị ref của khối qr = output `channel.status` (hoặc riêng phần `login` kèm `channel_account_id`). */
export function qrSeed(v: unknown): QrState {
  if (!v || typeof v !== 'object') return { accountId: null, login: null, png: null };
  const o = v as { channel_account_id?: unknown; login?: unknown; status?: unknown };
  const accountId = typeof o.channel_account_id === 'string' ? o.channel_account_id : null;
  const login = (o.login && typeof o.login === 'object' ? o.login : typeof o.status === 'string' ? o : null) as QrLogin | null;
  return { accountId, login, png: null };
}

const visible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden';

export function useQrAttempt(seed: QrState, opts: { runId: string; node: string; onConnected?: () => void }) {
  const [s, setS] = useState<QrState>(seed);
  const resumed = useRef(false);
  const sawLive = useRef(false);
  const { runId, node } = opts;
  // Callback trong ref: hẹn giờ poll không bị dựng lại mỗi lần màn chứa render (tránh poll dồn).
  const onConnected = useRef(opts.onConnected);
  useEffect(() => {
    onConnected.current = opts.onConnected;
  }, [opts.onConnected]);

  const poll = useCallback(async () => {
    if (!s.accountId || !visible()) return;
    try {
      const r = await transport.action<ChannelStatusDto>('channel.status', { channel_account_id: s.accountId });
      if (r.status !== 200) return;
      const login = r.data.result.login;
      if (!login) return;
      if (!login.terminal) sawLive.current = true;
      let png: string | null = null;
      if (login.status === 'waiting' && login.qr_ref) {
        const [path, qs] = login.qr_ref.split('?');
        png = await transport
          .get<{ png_base64: string }>(path!, Object.fromEntries(new URLSearchParams(qs ?? '')))
          .then((x) => x.png_base64)
          .catch(() => null);
      }
      setS((cur) => ({ ...cur, login, png }));
      if (login.status === 'connected' && sawLive.current && !resumed.current && login.attempt) {
        resumed.current = true;
        await transport.action('assistant.resume', { run_id: runId, node, channel_account_id: s.accountId, attempt: login.attempt }).catch(() => undefined);
        onConnected.current?.();
      }
    } catch {
      /* lỗi mạng tạm thời — lần poll sau thử lại */
    }
  }, [s.accountId, runId, node]);

  const terminal = s.login?.terminal ?? false;
  useEffect(() => {
    if (!s.accountId || terminal) return;
    // Lần đầu ngay (hẹn giờ 0 — cập nhật state trong callback, không trong thân effect), sau đó mỗi 2 giây.
    const first = setTimeout(() => void poll(), 0);
    const h = setInterval(() => void poll(), QR_POLL_MS);
    return () => {
      clearTimeout(first);
      clearInterval(h);
    };
  }, [s.accountId, terminal, poll]);

  /** Mã hết hạn → làm mới trên CÙNG tài khoản (không tạo tài khoản mới); poll lại từ đầu. */
  const restart = useCallback(() => {
    setS((cur) => ({ ...cur, login: cur.login ? { ...cur.login, status: 'waiting', terminal: false, qr_ref: null } : null, png: null }));
  }, []);

  return { ...s, restart };
}
