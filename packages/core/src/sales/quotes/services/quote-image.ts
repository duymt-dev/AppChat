// Báo giá dạng ảnh + link công khai (TIP-032b P2, COMMERCE §3 "gửi PDF hoặc ảnh qua kênh hội thoại"): ảnh render từ CHÍNH PDF đã đóng
// băng của lần gửi — đủ trang, đúng thứ tự, cùng số tiền / dòng miễn trừ, không dựng lại từ dữ liệu sống. Mỗi trang một tệp PNG
// `Bao-gia-<code>-L<v>-trang-<n>.png`; kênh không gửi được ảnh (manifest `send` thiếu image) → 422 ở action trước khi đổi trạng thái,
// không tự hạ về PDF. Webchat kèm link công khai xem / tải PDF (token miền "doc:", hạn = hết hiệu lực + 30 ngày). TIP-028b: chạy ở job
// `doc-render` (quote-render.ts) — action chỉ kiểm khả năng kênh.
import { AppError } from '@appchat/shared';
import { channelRegistry } from '@appchat/channels';
import { LINK_DAYS, issueDocumentLink } from '../../documents/document-link';
import type { QuoteRecord } from '../quote-access';
import type { QuoteDeps } from './quote-deps';

const DAY = 24 * 3600_000;

/** Kênh gửi được ảnh theo manifest (zalo_personal / webchat có `image`; email gửi ảnh như tệp đính kèm). */
export function canSendImages(channel: string): boolean {
  if (channel === 'email') return true;
  return channelRegistry.get(channel)?.manifest.capabilities.send.includes('image') ?? false;
}

/** Kiểm ở action (trước khi đổi trạng thái): format ảnh cần kênh gửi được ảnh + bộ render ảnh. */
export function assertDeliverable(d: QuoteDeps, input: { channel: string; format?: 'pdf' | 'image' }): void {
  if (input.format !== 'image') return;
  if (!canSendImages(input.channel)) throw new AppError('VALIDATION_FAILED', 422, { format: 'channel_no_image' });
  if (!d.renderer || !d.files) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'image_unavailable' });
}

export const quoteDelivery = {
  /** Ảnh từng trang của PDF đã đóng băng (thứ tự trang). */
  async pages(d: QuoteDeps, pdf: Buffer, pdfName: string): Promise<{ name: string; png: Buffer }[]> {
    if (!d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'image_unavailable' });
    const base = pdfName.replace(/\.pdf$/i, '');
    return (await d.renderer.pdfPages(pdf)).map((png, i) => ({ name: `${base}-trang-${i + 1}.png`, png }));
  },

  /** Link công khai xem / tải PDF (webchat) — phát SAU khi tệp tenant đã lưu. */
  async link(d: QuoteDeps, ws: string, q: Pick<QuoteRecord, 'id' | 'version' | 'validUntil'>, fileId: string, now: Date): Promise<string> {
    const until = q.validUntil ?? now;
    return (await issueDocumentLink(d.need('platform'), d.need('env'), { ws, kind: 'quote', documentId: q.id, version: q.version, fileId, now, expiresAt: new Date(until.getTime() + LINK_DAYS * DAY) })).url;
  },
};
