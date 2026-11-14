// Kind `quote` của queue `doc-render` (TIP-028b §1, AC1): `quote.send` chuyển báo giá sang `sent` + chụp mẫu / hạn / kênh / người gửi
// rồi trả ngay; job render PDF đóng băng (mẫu + hạn đã chụp, giờ gửi = `sent_at`) → tệp id tất định theo (render, thế hệ) → ảnh trang
// (format image) → trong transaction của job: báo giá còn `sent` / `viewed` + chưa có tệp (AppError 409 khi không còn — lỗi vĩnh viễn),
// gắn `file_id + sha256`, link công khai webchat, tin + tệp vào hội thoại của khách theo người gửi đã chụp. Event `quote.sent` ghi lúc
// action (trạng thái + timeline + giai đoạn khách đổi ngay) — job chỉ thêm `document.rendered`.
import { AppError, interpolate, serverMessages } from '@appchat/shared';
import type { TenantDb } from '@appchat/db';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { stableTriggerId } from '../../../kernel/actions/system';
import { registerRenderKind, type RenderJobRow, type RenderedFile } from '../../../documents/public';
import { writeOutgoing } from '../../../inbox/public';
import { scopeCols } from '../../../inbox/public';
import type { QuoteDeps } from './quote-deps';
import { renderQuotePdf } from './quote-doc';
import { pdfLinkOf, quoteLinkOf } from './quote-env';
import { quoteDelivery } from './quote-image';
import { customerConversation, type QuoteChannel } from './quote-send';

export const QUOTE_RENDER_KIND = 'quote';
const LIVE = ['sent', 'viewed'] as const;

/** Tham số phát hành chụp lúc `quote.send` (không có nội dung chứng từ). */
export interface QuoteRenderRequest {
  channel: QuoteChannel;
  format: 'pdf' | 'image';
  sender: { type: 'user' | 'agent' | 'system'; id: string | null; name: string | null };
}

/** Id tệp tất định theo (render, thế hệ, vai trò) — worker chết giữa chừng chạy lại → ghi đè cùng id, không thêm tệp. */
export const renderFileId = (row: Pick<RenderJobRow, 'id' | 'generation'>, part: string) => stableTriggerId('doc-render', row.id, String(row.generation), part);

async function upsertFile(db: TenantDb, d: QuoteDeps, ws: string, id: string, f: { name: string; mime: string; body: Buffer }) {
  const files = d.files;
  if (!files) throw new AppError('NOT_IMPLEMENTED', 501, { tip: '020' }, 'FilesService chưa cấu hình');
  // Lượt trước đã lưu tệp (chết trước khi phát hành) → dùng lại đúng tệp đó.
  const prev = await db.file.findUnique({ where: { id }, select: { id: true, name: true, sha256: true } });
  if (prev?.sha256) return { id: prev.id, name: prev.name, sha256: prev.sha256 };
  const row = await files.upload(db, ws, { id, name: f.name, mime: f.mime, body: f.body, purpose: 'document', uploadedBy: null });
  return { id: row.id, name: row.name, sha256: row.sha256 };
}

async function render(d: QuoteDeps, db: TenantDb, ws: string, row: RenderJobRow): Promise<RenderedFile> {
  const req = row.request as unknown as QuoteRenderRequest;
  const q = await db.quote.findUnique({ where: { id: row.documentId } });
  if (!q || q.deletedAt || !LIVE.includes(q.status as (typeof LIVE)[number]) || !q.sentAt || !q.validUntil) throw new AppError('INVALID_STATE', 409, { quote_id: 'not_sent' });
  const r = await renderQuotePdf(db, d.doc(), ws, q, q.validUntil);
  const name = interpolate(serverMessages(r.doc.locale).sales.quote.pdfName, { code: q.code, version: q.version });
  const pdf = await upsertFile(db, d, ws, renderFileId(row, 'pdf'), { name, mime: 'application/pdf', body: r.pdf });
  const m = serverMessages(r.doc.locale).sales.quote;
  const text = interpolate(m.message, {
    customer: r.doc.data.customer.name ?? '',
    business: r.doc.business.legal_name ?? '',
    code: q.code,
    version: q.version,
    total: r.doc.data.totals.total ?? '',
    valid_until: r.doc.data.doc.valid_until ?? '',
    link: quoteLinkOf(d.need('env'), ws, q.id),
  });
  const extra: NonNullable<RenderedFile['extra']> = [];
  if (req.format === 'image') {
    const pages = await quoteDelivery.pages(d, r.pdf, name);
    for (const [i, p] of pages.entries()) {
      const f = await upsertFile(db, d, ws, renderFileId(row, `page-${i + 1}`), { name: p.name, mime: 'image/png', body: p.png });
      extra.push({ fileId: f.id, name: f.name, mime: 'image/png' });
    }
  }
  return { fileId: pdf.id, sha256: pdf.sha256, name: pdf.name, extra, meta: { text } };
}

async function publish(d: QuoteDeps, tx: TenantTx, ws: string, row: RenderJobRow, file: RenderedFile, now: Date) {
  const req = row.request as unknown as QuoteRenderRequest;
  await tx.$queryRaw`SELECT 1 FROM quote WHERE id = ${row.documentId}::uuid FOR UPDATE`;
  const q = await tx.quote.findUnique({ where: { id: row.documentId } });
  if (!q || q.deletedAt || !LIVE.includes(q.status as (typeof LIVE)[number]) || !q.validUntil) throw new AppError('INVALID_STATE', 409, { quote_id: 'not_sent' });
  const contact = await tx.contact.findUniqueOrThrow({ where: { id: q.contactId }, select: { id: true, name: true, email: true, ownerUserId: true } });
  const target = await customerConversation(tx, contact, req.channel, `${q.code} · ${contact.name}`, now);
  const pages = file.extra ?? [];
  await tx.file.updateMany({ where: { id: { in: [file.fileId, ...pages.map((p) => p.fileId)] } }, data: { confirmed: true } });
  const env = d.need('env');
  const link = req.channel === 'webchat' ? await quoteDelivery.link(d, ws, q, file.fileId, now) : null;
  const atts = pages.length
    ? pages.map((p) => ({ url: pdfLinkOf(env, ws, p.fileId), mime: 'image/png', name: p.name, fileId: p.fileId }))
    : [{ url: pdfLinkOf(env, ws, file.fileId), mime: 'application/pdf', name: file.name, fileId: file.fileId }];
  const sha = new Map((await tx.file.findMany({ where: { id: { in: atts.map((a) => a.fileId) } }, select: { id: true, sha256: true } })).map((f) => [f.id, f.sha256 ?? undefined]));
  const text = String(file.meta?.text ?? '');
  const out = await writeOutgoing(tx, {
    conv: target.conv,
    kind: pages.length ? 'image' : 'file',
    body: link ? `${text}\n${link}` : text,
    attachments: atts.map((a) => ({ ...a, ...(sha.get(a.fileId) ? { sha256: sha.get(a.fileId) } : {}) })),
    sender: req.sender,
    now,
  });
  if (target.created) out.job.proactive = true;
  await tx.quote.update({ where: { id: q.id }, data: { fileId: file.fileId, fileSha256: file.sha256, conversationId: target.conv.id, updatedAt: now } });
  const cols = await scopeCols(tx, target.conv);
  return {
    out: [out],
    events: [
      ...(target.created ? [{ topic: 'conversation.updated', payload: { ...cols, change: 'created' } }] : []),
      { topic: 'message.updated', payload: { ...cols, message_id: out.messageId, change: 'status' } },
    ],
  };
}

/** Đăng ký một lần lúc bootstrap (API + worker ROLE=jobs dựng cùng QuoteDeps). */
export function registerQuoteRenderKind(d: QuoteDeps): void {
  registerRenderKind(QUOTE_RENDER_KIND, { render: (db, ws, row) => render(d, db, ws, row), publish: (tx, ws, row, file, now) => publish(d, tx, ws, row, file, now) });
}
