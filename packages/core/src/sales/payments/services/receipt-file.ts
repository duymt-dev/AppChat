// PDF phiếu thu đóng băng (COMMERCE §5): lần đầu render + lưu tệp (`receipt_file_id`, CAS chỉ khi còn null — hai yêu cầu cùng lúc thì bản
// thắng được giữ, bản thua bỏ), sau đó luôn trả bản đã lưu. Dùng cho tải PDF (`GET /invoices/receipts/:id/pdf`) và `receipt.send` (TIP-032b).
import type { TenantDb } from '@appchat/db';
import { interpolate, serverMessages } from '@appchat/shared';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import type { InvoiceRecord } from '../invoice-access';
import { receiptDocData, renderDocPdf, savePdf } from './invoice-doc';

type Payment = NonNullable<Awaited<ReturnType<TenantDb['customerPayment']['findUnique']>>>;

export async function ensureReceiptPdf(db: TenantDb, d: QuoteDeps, ws: string, i: InvoiceRecord, p: Payment): Promise<{ name: string; pdf: Buffer; fileId: string | null }> {
  const stored = p.receiptFileId && d.files ? await d.files.read(db, p.receiptFileId) : null;
  if (stored) return { name: stored.row.name, pdf: stored.body, fileId: p.receiptFileId };
  const doc = await receiptDocData(db, d.doc(), ws, i, p);
  const pdf = await renderDocPdf(db, d.doc(), 'receipt', doc.data, doc.locale, p.templateId);
  const name = interpolate(serverMessages(doc.locale).sales.invoice.receiptName, { code: p.receiptCode ?? '' });
  if (!d.files) return { name, pdf, fileId: null };
  const f = await savePdf(db, d.doc(), ws, name, pdf, null);
  const won = await db.$transaction(async (tx) => {
    await tx.file.updateMany({ where: { id: f.fileId }, data: { confirmed: true } });
    return (await tx.customerPayment.updateMany({ where: { id: p.id, receiptFileId: null }, data: { receiptFileId: f.fileId } })).count === 1;
  });
  if (won) return { name, pdf, fileId: f.fileId };
  const cur = await db.customerPayment.findUniqueOrThrow({ where: { id: p.id }, select: { receiptFileId: true } });
  const again = cur.receiptFileId && d.files ? await d.files.read(db, cur.receiptFileId) : null;
  return again ? { name: again.row.name, pdf: again.body, fileId: cur.receiptFileId } : { name, pdf, fileId: f.fileId };
}
