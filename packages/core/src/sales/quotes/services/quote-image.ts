// Báo giá dạng ảnh + link công khai (TIP-032b P2, COMMERCE §3 "gửi PDF hoặc ảnh qua kênh hội thoại"): ảnh render từ CHÍNH PDF đã đóng
// băng của lần gửi (`freezeQuotePdf`) — đủ trang, đúng thứ tự, cùng số tiền / dòng miễn trừ, không dựng lại từ dữ liệu sống. Mỗi trang
// một tệp PNG `Bao-gia-<code>-L<v>-trang-<n>.png`; kênh không gửi được ảnh (manifest `send` thiếu image) → 422 trước khi ghi tin, không
// tự hạ về PDF. Webchat kèm link công khai xem / tải PDF (token miền "doc:", hạn = hết hiệu lực + 30 ngày). Chạy trong `prepare`.
import type { TenantDb } from '@appchat/db';
import { AppError } from '@appchat/shared';
import { channelRegistry } from '@appchat/channels';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { actorUserId } from '../../../crm/public';
import { LINK_DAYS, issueDocumentLink } from '../../documents/document-link';
import type { QuoteRecord } from '../quote-access';
import type { QuoteDeps } from './quote-deps';

const DAY = 24 * 3600_000;

/** Kênh gửi được ảnh theo manifest (zalo_personal / webchat có `image`; email gửi ảnh như tệp đính kèm). */
export function canSendImages(channel: string): boolean {
  if (channel === 'email') return true;
  return channelRegistry.get(channel)?.manifest.capabilities.send.includes('image') ?? false;
}

export async function quoteDelivery(
  ctx: ActionContext,
  db: TenantDb,
  d: QuoteDeps,
  q: QuoteRecord,
  frozen: { fileId: string; name: string; pdf: Buffer },
  input: { channel: string; format?: 'pdf' | 'image' },
  now: Date,
  validUntil: Date,
): Promise<{ pages: { fileId: string; name: string }[]; link: string | null }> {
  const pages: { fileId: string; name: string }[] = [];
  if (input.format === 'image') {
    if (!canSendImages(input.channel)) throw new AppError('VALIDATION_FAILED', 422, { format: 'channel_no_image' });
    if (!d.renderer || !d.files) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'image_unavailable' });
    const pngs = await d.renderer.pdfPages(frozen.pdf);
    const base = frozen.name.replace(/\.pdf$/i, '');
    for (const [i, png] of pngs.entries()) {
      const name = `${base}-trang-${i + 1}.png`;
      const f = await d.files.upload(db, ctx.workspaceId, { name, mime: 'image/png', body: png, purpose: 'document', uploadedBy: actorUserId(ctx) });
      pages.push({ fileId: f.id, name });
    }
  }
  const link =
    input.channel === 'webchat'
      ? (
          await issueDocumentLink(d.need('platform'), d.need('env'), {
            ws: ctx.workspaceId,
            kind: 'quote',
            documentId: q.id,
            version: q.version,
            fileId: frozen.fileId,
            now,
            expiresAt: new Date(validUntil.getTime() + LINK_DAYS * DAY),
          })
        ).url
      : null;
  return { pages, link };
}
