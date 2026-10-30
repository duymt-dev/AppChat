// Điểm vào widget.js (mã nhúng: `<script src=".../widget.js" data-key="wk_…" data-api="https://api…">`). Nối Socket.IO namespace
// `/widget` (chỉ websocket — không cần CORS cho trang nhúng khác origin), lưu `visitor_token` theo key (localStorage — chặn thì
// chạy khách tạm), dựng ChatWidget.
import { io, type Socket } from 'socket.io-client';
import { pickLocale } from './i18n';
import type { Ack, HelloResult, WidgetMessage, WidgetTransport } from './types';
import { ChatWidget } from './ui';

const TIMEOUT_MS = 10_000;

function socketTransport(s: Socket): WidgetTransport {
  const call = <T>(ev: string, p: unknown) =>
    s
      .timeout(TIMEOUT_MS)
      .emitWithAck(ev, p)
      .then(
        (r) => r as Ack<T>,
        () => ({ error: { code: 'TIMEOUT' } }) as Ack<T>,
      );
  return {
    hello: (p) => call<HelloResult>('visitor.hello', p),
    send: (p) => call<{ id: string; at: string }>('message.send', p),
    onMessage: (fn) => void s.on('message.new', (m: WidgetMessage) => fn(m)),
    onDown: (fn) => void s.on('connect_error', (e: Error & { data?: { code?: string } }) => fn(e.data?.code ?? 'OFFLINE')),
  };
}

function store(key: string) {
  const k = `appchat:wv:${key}`;
  return {
    get: () => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set: (v: string) => {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* chặn bộ nhớ — mỗi lần tải là khách mới */
      }
    },
  };
}

export function mount(script: HTMLScriptElement): ChatWidget | null {
  const key = script.dataset.key;
  const api = script.dataset.api ?? new URL(script.src).origin;
  if (!key || document.querySelector('appchat-widget')) return null;
  const tokens = store(key);
  const host = document.createElement('appchat-widget');
  document.body.append(host);
  const s = io(`${api}/widget`, { auth: { public_key: key, visitor_token: tokens.get() ?? undefined }, transports: ['websocket'], reconnectionAttempts: 5 });
  const w = new ChatWidget(host, { transport: socketTransport(s), locale: pickLocale(script.dataset.locale, document), saveToken: tokens.set, pageUrl: location.href });
  // Mỗi lần (re)connect: `hello` lấy lại lịch sử + token (token mới đặt vào auth cho lần kết nối lại sau).
  s.on('connect', () => void w.start().then(() => void (s.auth = { public_key: key, visitor_token: tokens.get() ?? undefined })));
  return w;
}

const current = document.currentScript as HTMLScriptElement | null;
if (current) {
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => mount(current));
  else mount(current);
}
