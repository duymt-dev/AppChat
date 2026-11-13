// Mô phỏng job `doc-render` ở mock (TIP-028b §1): `quote.send` đặt `render = pending_render` (API trả ngay), sau một nhịp "worker"
// render xong → `rendered` + phát `document.render` (như WS của server) để UI tự làm mới. Báo giá có ghi chú chứa `[render-fail]` → lỗi
// `render_failed` (E2E kiểm nút Thử lại). `quote.retry_render` chỉ từ `render_failed`, cùng luật server.
import { ApiRequestError } from '@appchat/shared';
import type { MockHandler } from '../handlers';
import { mutate, type MockDb } from '../store';
import { find, type Quote } from './quotes';

export const RENDER_DELAY_MS = 2_000;
export const RENDER_FAIL_MARK = '[render-fail]';

export type RenderMock = { status: 'pending_render' | 'rendered' | 'render_failed'; error: string | null };

/** Đặt chờ render + hẹn "worker" chạy (ngoài mutate hiện tại). */
export function queueRender(q: Quote): void {
  q.render = { status: 'pending_render', error: null };
  const id = q.id;
  setTimeout(() => {
    mutate((db: MockDb) => {
      const cur = db.quotes.quotes.find((x) => x.id === id);
      if (!cur || cur.render?.status !== 'pending_render') return;
      cur.render = cur.note.includes(RENDER_FAIL_MARK) ? { status: 'render_failed', error: 'RENDER_FAILED' } : { status: 'rendered', error: null };
    }, 'document.render');
  }, RENDER_DELAY_MS);
}

export const quoteRenderHandlers: Record<string, MockHandler> = {
  'quote.retry_render': {
    execute: (db, i: { quote_id: string }) => {
      const q = find(db, i.quote_id);
      if (q.status !== 'sent' && q.status !== 'viewed') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: 'INVALID_STATE', fields: { status: q.status } });
      if (q.render?.status !== 'render_failed') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: 'INVALID_STATE', fields: { render: q.render?.status ?? 'none' } });
      // Lần thử lại thành công (ghi chú lỗi chỉ áp lượt đầu).
      q.note = q.note.replace(RENDER_FAIL_MARK, '').trim();
      queueRender(q);
      return { quote_id: q.id, render: 'pending_render' };
    },
  },
};
