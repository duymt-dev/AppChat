// Render chứng từ ra PDF (templates.md §2): mẫu `rich` → HTML đã điền → LibreOffice; mẫu `docx` → gắn thẻ theo field_map → docxtemplater
// điền dữ liệu → LibreOffice. Tối đa 2 lượt chuyển cùng lúc mỗi tiến trình (K8 — LibreOffice tốn CPU), mỗi lượt ≤ 60 giây.
// Đề nghị thanh toán / phiếu thu luôn có dòng "không thay thế hoá đơn GTGT" (thiếu thì chèn).
import type { TenantDb } from '@appchat/db';
import { AppError, NOT_VAT_KINDS, hasNotVatLine, htmlPage, renderRich, serverMessages, type DocData, type DocKind } from '@appchat/shared';
import type { FilesService } from '../../kernel/files/files.service';
import { appendParagraph, docxParagraphs, fillDocx, openDocx, tagDocx } from './docx';
import type { PdfConverter } from './soffice';

export const PDF_CONVERTER = Symbol('PDF_CONVERTER');
export const RENDER_CONCURRENCY = 2;

export interface RenderTemplate {
  kind: string;
  name: string;
  source: 'rich' | 'docx';
  bodyHtml: string | null;
  docxFileId: string | null;
  fieldMap: unknown;
}

/** Hàng chờ đơn giản: tối đa `n` việc chạy cùng lúc. */
class Limiter {
  private active = 0;
  private readonly wait: (() => void)[] = [];
  constructor(private readonly n: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.n) await new Promise<void>((r) => this.wait.push(r));
    this.active++;
    try {
      return await fn();
    } finally {
      this.active--;
      this.wait.shift()?.();
    }
  }
}

export class DocRenderer {
  private readonly limit = new Limiter(RENDER_CONCURRENCY);

  constructor(
    private readonly converter: PdfConverter,
    private readonly files: FilesService,
  ) {}

  /** HTML đã điền của mẫu rich (cũng dùng cho kiểm thử nội dung — không cần LibreOffice). */
  richHtml(t: RenderTemplate, data: DocData, locale: string): string {
    if (!t.bodyHtml) throw new AppError('VALIDATION_FAILED', 422, { template_id: 'no_body' });
    return htmlPage(t.name, renderRich(t.kind as DocKind, t.bodyHtml, data, serverMessages(locale).documents.notVat));
  }

  /** DOCX đã điền của mẫu docx (trả kèm PDF khi bố cục LibreOffice lệch Word — Blueprint K8). */
  async filledDocx(db: Pick<TenantDb, 'file'>, t: RenderTemplate, data: DocData, locale: string): Promise<Buffer> {
    const f = t.docxFileId ? await this.files.read(db, t.docxFileId) : null;
    if (!f) throw new AppError('NOT_FOUND', 404, { file_id: 'not_found' });
    const zip = openDocx(f.body);
    tagDocx(zip, (t.fieldMap ?? []) as { placeholder: string; variable: string }[]);
    const kind = t.kind as DocKind;
    if (NOT_VAT_KINDS.includes(kind) && !hasNotVatLine(kind, docxParagraphs(zip).join('\n'))) appendParagraph(zip, serverMessages(locale).documents.notVat);
    return fillDocx(zip, data as unknown as Record<string, unknown>);
  }

  /** HTML hoàn chỉnh (đã escape) → PDF — trang chữ ký / chứng nhận ký hợp đồng (TIP-030). */
  async htmlPdf(html: string): Promise<Buffer> {
    return this.limit.run(() => this.converter.toPdf(Buffer.from(html, 'utf8'), 'html'));
  }

  async pdf(db: Pick<TenantDb, 'file'>, t: RenderTemplate, data: DocData, locale: string): Promise<Buffer> {
    const input = t.source === 'rich' ? { body: Buffer.from(this.richHtml(t, data, locale), 'utf8'), ext: 'html' as const } : { body: await this.filledDocx(db, t, data, locale), ext: 'docx' as const };
    return this.limit.run(() => this.converter.toPdf(input.body, input.ext));
  }
}
