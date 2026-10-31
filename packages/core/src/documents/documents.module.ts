// Domain `documents` (TIP-028, D30 — standards/documents/templates.md): mẫu chứng từ rich / DOCX, biến chuẩn, AI nhận diện biến DOCX,
// bảng kiểm pháp lý, render PDF (LibreOffice headless). Báo giá / hợp đồng / đề nghị thanh toán (TIP-029 / 030 / 032) dùng DocRenderer.
// Thiếu DB → service null; thiếu AI runtime → detect_fields dùng bộ luật tất định.
import { Module } from '@nestjs/common';
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { CLOCK, type Clock } from '../kernel/clock';
import { ENV_SOURCE } from '../kernel/kernel.module';
import { FilesService } from '../kernel/files/files.service';
import { PLATFORM_DB, TENANT_RESOLVER } from '../kernel/tenant/tenant.providers';
import { AiModule } from '../ai/ai.module';
import { CrmModule } from '../crm/crm.module';
import { CrmMembers } from '../crm/public';
import { DocTemplateCreateHandler, DocTemplateDeleteHandler, DocTemplateDetectHandler, DocTemplateUpdateHandler } from './actions/doc-template.handlers';
import { DocRenderer, PDF_CONVERTER } from './services/doc-renderer';
import { DocumentsReadService } from './services/documents-read.service';
import { SofficeConverter, sofficePath, type PdfConverter } from './services/soffice';

const opt = (token: symbol | typeof FilesService) => ({ token, optional: true });

@Module({
  imports: [CrmModule, AiModule],
  providers: [
    DocTemplateCreateHandler,
    DocTemplateUpdateHandler,
    DocTemplateDeleteHandler,
    DocTemplateDetectHandler,
    { provide: PDF_CONVERTER, inject: [opt(ENV_SOURCE)], useFactory: (src?: Record<string, string | undefined>) => new SofficeConverter(sofficePath(src ?? process.env)) },
    {
      provide: DocRenderer,
      inject: [PDF_CONVERTER, opt(FilesService)],
      useFactory: (c: PdfConverter, f?: FilesService) => (f ? new DocRenderer(c, f) : null),
    },
    {
      provide: DocumentsReadService,
      inject: [opt(TENANT_RESOLVER), opt(PLATFORM_DB), CrmMembers, DocRenderer, CLOCK],
      useFactory: (r: TenantDbResolver | undefined, p: PlatformDb | undefined, m: CrmMembers | null, d: DocRenderer | null, c: Clock) =>
        r && p && m ? new DocumentsReadService(r, p, m, d, () => c.now()) : null,
    },
  ],
  exports: [DocRenderer, DocumentsReadService, PDF_CONVERTER],
})
export class DocumentsModule {}
