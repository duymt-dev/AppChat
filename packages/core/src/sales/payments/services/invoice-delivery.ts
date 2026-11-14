// Chuẩn bị gửi đề nghị thanh toán lần đầu (TIP-032b P2 — ngoài transaction, LibreOffice chậm): PDF đóng băng có ảnh VietQR nhúng, tệp ảnh
// VietQR riêng (Zalo / webchat — khách quét từ điện thoại; email đã có QR trong PDF), link công khai xem / tải PDF (webchat; mọi kênh nối
// được). Link phát SAU khi tệp tenant đã lưu; ghi platform lỗi → ném, action không ghi tin (không phát link chưa định tuyến). Nhắc lại
// (không phải lần đầu) không render lại — PDF đóng băng giữ nguyên số tiền lúc gửi.
import type { TenantDb } from '@appchat/db';
import { interpolate, serverMessages } from '@appchat/shared';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { actorUserId } from '../../../crm/public';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import type { InvoiceChannel } from './invoice-send';
import { issueDocumentLink } from '../../documents/document-link';
import type { InvoiceRecord } from '../invoice-access';
import { invoiceDocData, renderDocPdf, savePdf } from './invoice-doc';
import { qrPng } from './invoice-qr';

export interface InvoiceDelivery {
  file: { fileId: string; name: string } | null;
  qrFileId: string | null;
  link: string | null;
}

export async function prepareInvoiceDelivery(ctx: ActionContext, db: TenantDb, d: QuoteDeps, i: InvoiceRecord, channel: InvoiceChannel, now: Date): Promise<InvoiceDelivery> {
  const doc = await invoiceDocData(db, d.doc(), ctx.workspaceId, { ...i, sentAt: now });
  const pdf = await renderDocPdf(db, d.doc(), 'payment_request', doc.data, doc.locale, i.templateId);
  const name = interpolate(serverMessages(doc.locale).sales.invoice.pdfName, { code: i.code });
  const file = await savePdf(db, d.doc(), ctx.workspaceId, name, pdf, actorUserId(ctx));
  let qrFileId: string | null = null;
  if (doc.qr && channel !== 'email' && d.files) {
    const f = await d.files.upload(db, ctx.workspaceId, { name: `VietQR-${i.code}.png`, mime: 'image/png', body: await qrPng(doc.qr.payload), purpose: 'document', uploadedBy: actorUserId(ctx) });
    qrFileId = f.id;
  }
  const link =
    channel === 'webchat'
      ? (await issueDocumentLink(d.need('platform'), d.need('env'), { ws: ctx.workspaceId, kind: 'payment_request', documentId: i.id, version: i.version + 1, fileId: file.fileId, now })).url
      : null;
  return { file, qrFileId, link };
}
