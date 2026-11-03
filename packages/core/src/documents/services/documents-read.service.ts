// Đọc mẫu chứng từ (Blueprint §4.4 `GET /v1/doc-templates?kind=` — shape packages/shared/src/api/documents.ts) + PDF xem trước của
// một mẫu với dữ liệu minh hoạ (`GET /v1/doc-templates/:id/preview`). Bảng nhỏ (vài chục mẫu / workspace): không phân trang,
// đọc theo index partial `doc_template_live_kind_idx (kind, is_default DESC, updated_at DESC, id)`.
import type { PlatformDb, TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import { AppError, serverMessages, type DocKind, type DocTemplateRow } from '@appchat/shared';
import type { CrmMembers } from '../../crm/public';
import { businessData, sampleData } from './doc-data';
import type { DocRenderer } from './doc-renderer';
import { liveTemplate, missingOf } from './template-store';

export interface DocViewer {
  workspaceId: string;
  userId: string;
}

const KINDS = new Set(['quote', 'contract', 'payment_request', 'receipt']);

export class DocumentsReadService {
  constructor(
    private readonly tenants: TenantDbResolver,
    private readonly platform: PlatformDb,
    private readonly members: CrmMembers,
    private readonly renderer: DocRenderer | null,
    private readonly now: () => Date,
  ) {}

  private db(v: DocViewer) {
    return this.tenants.get(TenantContexts.fromMembership(v.workspaceId, v.userId));
  }

  async list(v: DocViewer, kind?: string): Promise<DocTemplateRow[]> {
    if (kind && !KINDS.has(kind)) throw new AppError('VALIDATION_FAILED', 400, { kind: 'invalid' });
    const db = await this.db(v);
    const rows = await db.docTemplate.findMany({
      where: { deletedAt: null, ...(kind ? { kind: kind as DocKind } : {}) },
      orderBy: [{ kind: 'asc' }, { isDefault: 'desc' }, { updatedAt: 'desc' }, { id: 'asc' }],
    });
    const files = await db.file.findMany({ where: { id: { in: rows.map((r) => r.docxFileId).filter((x): x is string => !!x) } }, select: { id: true, name: true } });
    const fileName = new Map(files.map((f) => [f.id, f.name]));
    const names = await this.members.names(rows.map((r) => r.updatedBy));
    const { locale } = await businessData(this.platform, v.workspaceId);
    const system = serverMessages(locale).catalog.activity.system;
    return rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      name: r.name,
      source: r.source,
      ...(r.bodyHtml !== null ? { body: r.bodyHtml } : {}),
      ...(r.docxFileId ? { file_id: r.docxFileId, file_name: fileName.get(r.docxFileId) ?? '' } : {}),
      fields: (r.fieldMap ?? []) as { placeholder: string; variable: string }[],
      checklist_missing: missingOf(r.checklistResult),
      is_default: r.isDefault,
      contract_kind: (r.contractKind ?? null) as DocTemplateRow['contract_kind'],
      version: r.version,
      updated_by: (r.updatedBy && names.get(r.updatedBy)) || system,
      updated_at: r.updatedAt.toISOString(),
    }));
  }

  /** PDF của mẫu điền dữ liệu minh hoạ (hồ sơ DN thật + khách / dòng hàng mẫu). */
  async preview(v: DocViewer, id: string): Promise<{ pdf: Buffer; name: string }> {
    if (!this.renderer) throw new AppError('NOT_IMPLEMENTED', 501, { render: 'render_unavailable' });
    const db = await this.db(v);
    const t = await liveTemplate(db, id);
    const biz = await businessData(this.platform, v.workspaceId);
    const owner = (await this.members.names([v.userId])).get(v.userId) ?? '';
    const data = sampleData(t.kind as DocKind, biz.business, { locale: biz.locale, timeZone: biz.timeZone, now: this.now(), owner });
    return { pdf: await this.renderer.pdf(db, t, data, biz.locale), name: t.name };
  }
}
