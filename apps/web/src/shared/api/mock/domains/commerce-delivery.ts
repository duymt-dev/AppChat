// Mock gửi chứng từ cho khách (TIP-032b P2): luật `order.send_confirmation` / `receipt.send` như server (đơn huỷ → INVALID_STATE, khoản
// thu chưa xác nhận / không có phiếu thu → INVALID_STATE, kênh ngoài danh sách → VALIDATION_FAILED). Ghi lại lần gửi để màn / test đọc.
// Kiểu cấu trúc, không import handlers / store / domain khác — handler gắn ở orders-actions / invoices-actions (tránh vòng phụ thuộc).
import { ApiRequestError } from '@appchat/shared';

const CHANNELS = ['zalo_personal', 'email', 'webchat'];

export interface SentDoc {
  kind: 'order_confirmation' | 'receipt';
  ref: string;
  channel: string;
}

/** Lần gửi trong phiên mock (sống theo module như phụ lục). */
const sent: SentDoc[] = [];
export const sentDocs = () => sent;
export const resetSentDocs = () => void sent.splice(0);

const channelOf = (c?: string) => {
  const ch = c ?? 'zalo_personal';
  if (!CHANNELS.includes(ch)) throw new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'channel', fields: { channel: 'invalid' } });
  return ch;
};

export function sendOrderConfirmation(o: { id: string; code: string; status: string; contact_id: string }, channel?: string) {
  if (o.status === 'cancelled') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: o.code, fields: { status: o.status } });
  const ch = channelOf(channel);
  sent.push({ kind: 'order_confirmation', ref: o.id, channel: ch });
  return { order_id: o.id, message_id: `msg_oc_${sent.length}`, conversation_id: `conv_${o.contact_id}`, channel: ch };
}

type Pay = { id: string; status: string; kind?: string; receipt_code?: string | null };

export function sendReceipt(invoices: { contact_id: string; payments: Pay[] }[], paymentId: string, channel?: string) {
  const inv = invoices.find((x) => x.payments.some((p) => p.id === paymentId));
  const p = inv?.payments.find((x) => x.id === paymentId);
  if (!inv || !p) throw new ApiRequestError(404, { code: 'NOT_FOUND', message: paymentId });
  if (p.status !== 'confirmed' || !p.receipt_code || p.kind === 'refund') throw new ApiRequestError(409, { code: 'INVALID_STATE', message: p.id, fields: { payment_id: p.status } });
  const ch = channelOf(channel);
  sent.push({ kind: 'receipt', ref: p.id, channel: ch });
  return { payment_id: p.id, receipt_code: p.receipt_code, message_id: `msg_rc_${sent.length}`, conversation_id: `conv_${inv.contact_id}`, channel: ch };
}

/** Token công khai ở mock = `<loại>~<mã>` (server: token ký HMAC + bảng commerce_link). Loại lạ / thiếu mã → 410 như server. */
const KINDS = ['quote', 'payment_request', 'contract', 'order_confirmation', 'receipt'] as const;
const parseToken = (token: string) => {
  const [kind, code] = decodeURIComponent(token).split('~');
  if (!code || !(KINDS as readonly string[]).includes(kind ?? '')) throw new ApiRequestError(410, { code: 'SIGN_LINK_INVALID', message: 'link' });
  return { kind: kind as (typeof KINDS)[number], code };
};

/** GET /public/documents/:token (mock). */
export const publicDocumentRoute = (path: string) => {
  const m = path.match(/^\/public\/documents\/([^/]+)$/);
  if (!m) return undefined;
  return () => {
    const { kind, code } = parseToken(m[1]!);
    return { kind, code, version: 1, business: 'Spa Hoa Sen', file_name: `${code}.pdf`, expires_at: '2026-12-01T00:00:00.000Z' };
  };
};

/** GET /public/documents/:token/pdf → HTML (mock không có LibreOffice). */
export const publicDocumentPdf = (path: string): string | null => {
  const m = path.match(/^\/public\/documents\/([^/]+)\/pdf$/);
  if (!m) return null;
  const { code } = parseToken(m[1]!);
  return `<!doctype html><meta charset="utf-8"><title>${code}</title><p>${code}</p>`;
};
