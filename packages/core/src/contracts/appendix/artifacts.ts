// Tài liệu ký của phụ lục (TIP-030b F3 spec 16): nội dung chữ → một trang HTML (escape) kèm mã phụ lục / hợp đồng cha / version / giá trị
// điều chỉnh; nguồn tệp → PDF gốc (bất biến, kiểm hash) hoặc DOCX đổi trong launcher cô lập. Đóng băng lúc Owner "Duyệt & ký" — digest
// (`file_sha256`) ràng buộc token / OTP / chữ ký; bản cuối = bản đóng băng + trang chứng nhận, lưu tệp MỚI. Tệp hợp đồng cha không đụng.
import type { TenantDb } from '@appchat/db';
import { AppError, createFmt, htmlPage, interpolate, serverMessages } from '@appchat/shared';
import type { ContractRecord } from '../contract-access';
import type { ContractDeps } from '../services/contract-deps';
import { signingContent } from '../files/source';
import type { AppendixRecord } from './access';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** HTML trang phụ lục — mọi chữ người dùng nhập đều escape. */
export function appendixHtml(a: Pick<AppendixRecord, 'code' | 'title' | 'bodyHtml' | 'valueDelta' | 'version'>, parent: Pick<ContractRecord, 'code' | 'title'>, locale: string, timeZone: string): string {
  const m = serverMessages(locale).sales.contract.appendix;
  const fmt = createFmt({ locale, timeZone });
  const delta = a.valueDelta === null ? '' : `<p>${esc(interpolate(m.valueDelta, { value: `${a.valueDelta < 0n ? '-' : ''}${fmt.money(String(a.valueDelta < 0n ? -a.valueDelta : a.valueDelta))}` }))}</p>`;
  const paras = (a.bodyHtml ?? '').split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('');
  return `<h1>${esc(m.title)}</h1><h2>${esc(a.code)} — ${esc(a.title)}</h2><p>${esc(interpolate(m.parent, { code: parent.code, title: parent.title }))}</p><p>${esc(interpolate(m.version, { version: a.version }))}</p>${delta}${paras}`;
}

/** PDF nội dung ký (chưa có chữ ký) của phụ lục. */
export async function appendixPdf(db: Pick<TenantDb, 'file'>, d: ContractDeps, ws: string, a: AppendixRecord, parent: ContractRecord): Promise<Buffer> {
  if (a.source === 'file') {
    const files = d.need('files');
    const { pdf } = await signingContent(db, files, d.isolated, { sourceFileId: a.sourceFileId, sourceHash: a.sourceHash, sourceMime: a.sourceMime, renderedUnsignedFileId: null, renderedUnsignedHash: null });
    return pdf;
  }
  if (!d.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
  const p = await d.place(ws);
  return d.renderer.htmlPdf(htmlPage(a.code, appendixHtml(a, parent, p.locale, p.timeZone)));
}

/** Lưu PDF phụ lục (chưa xác nhận — action xác nhận trong transaction). */
export async function storeAppendixPdf(db: Pick<TenantDb, 'file'>, d: ContractDeps, ws: string, a: Pick<AppendixRecord, 'code'>, pdf: Buffer, uploadedBy: string | null, signed: boolean) {
  const m = serverMessages((await d.place(ws)).locale).sales.contract.appendix;
  const name = interpolate(signed ? m.signedPdfName : m.pdfName, { code: a.code.replace(/[^\p{L}\p{N}-]+/gu, '-') });
  const f = await d.need('files').upload(db, ws, { name, mime: 'application/pdf', body: pdf, purpose: 'document', uploadedBy });
  return { fileId: f.id, sha256: f.sha256, name };
}
