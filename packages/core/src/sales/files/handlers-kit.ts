// Bộ handler tệp đính kèm dùng chung cho đơn / đề nghị (TIP-032d §1.2–1.5): mỗi domain khai class mỏng truyền `RecordPort` (khoá + kiểm quyền
// cha, bảng liên kết, đọc nhãn). Gắn: `prepare` kiểm cấu trúc staging NGOÀI transaction (sau xác nhận) → execute khoá khách gốc → cha (quyền
// GHI) → bộ tệp → claim → liên kết. Nhánh `assistant_artifact_ref` cài ở pha 3 (sao chép có đồng ý) — tới lúc đó trả 422 rõ ràng, không giả.
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import type { ActionPreview } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { HandlerOutcome } from '../../kernel/actions/handler';
import { preview } from '../../kernel/actions/preview-kit';
import type { FilesService } from '../../kernel/files/files.service';
import { actorUserId } from '../../crm/public';
import { attachStaged, detachOne, listPage, setRevision, stagedFor, type AttachmentTable, type FileRowOut } from './association';
import { validateStaged } from './validation';

export interface RecordPort {
  table: AttachmentTable;
  sql: 'order_attachment' | 'invoice_attachment';
  idField: 'order_id' | 'invoice_id';
  /** Khoá khách gốc + cha FOR UPDATE và kiểm quyền GHI hiện hành (404 / 403). Trả nhãn hiển thị (mã). */
  lockWritable(tx: TenantTx, authz: AuthzContext, id: string): Promise<{ code: string }>;
  /** Cha đọc được theo quyền hiện hành (404 nếu không). */
  readable(tx: TenantTx, authz: AuthzContext, id: string): Promise<{ code: string }>;
  /** Người xem còn quyền ghi cha (để hiện nút gắn / gỡ) — không ném. */
  writable(tx: TenantTx, authz: AuthzContext, id: string): Promise<boolean>;
  /** Chứng từ đã sinh (chỉ đề nghị) — mở / tải, không gỡ được. */
  generated?(tx: TenantTx, id: string): Promise<FileRowOut[]>;
}

type Source = { kind: 'target_upload_handle'; file_id: string } | { kind: 'assistant_artifact_ref'; artifact_id: string; revision: number };
export type AttachIn = { source: Source; if_revision: number };

const requireUser = (ctx: ActionContext) => {
  const me = actorUserId(ctx);
  if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
  return me;
};

function handleOf(s: Source): string {
  if (s.kind === 'assistant_artifact_ref') throw new AppError('VALIDATION_FAILED', 422, { source: 'artifact_copy_unavailable' });
  return s.file_id;
}

export class AttachmentKit {
  constructor(
    private readonly port: RecordPort,
    private readonly tenants: TenantDbResolver | null,
    private readonly files: FilesService | null,
    private readonly now: () => Date,
  ) {}

  /** Ngoài transaction, sau xác nhận: kiểm cấu trúc staging trong tiến trình cô lập (không model, không phí). */
  async prepare(ctx: ActionContext, parentId: string, i: AttachIn): Promise<void> {
    if (i.source.kind !== 'target_upload_handle' || !this.tenants || !this.files) return;
    void parentId;
    await validateStaged(await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'record-attachment')), this.files, i.source.file_id, this.now);
  }

  async attach(ctx: ActionContext, tx: TenantTx, parentId: string, i: AttachIn): Promise<HandlerOutcome<unknown>> {
    const me = requireUser(ctx);
    const fileId = handleOf(i.source);
    await this.port.lockWritable(tx, ctx.authz, parentId);
    await stagedFor(tx, { fileId, userId: me, type: this.port.table.type, parentId }).catch(async (e) => {
      // Gửi lại sau khi đã gắn (staging đã tiêu): liên kết sống của chính cha này → biên nhận cũ.
      if (await this.port.table.live(tx, parentId, fileId)) return null;
      throw e;
    });
    const r = await attachStaged(tx, this.port.table, { parentId, fileId, userId: me, ifRevision: i.if_revision, now: this.now() });
    const topic = `${this.port.table.type}.file_attached`;
    return { result: r, noUndo: true, ...(r.reused ? {} : { events: [{ topic, payload: { [this.port.idField]: parentId, attachment_id: r.attachment_id, revision: r.revision } }] }) };
  }

  async detach(ctx: ActionContext, tx: TenantTx, parentId: string, i: { attachment_id: string; if_version: number }): Promise<HandlerOutcome<unknown>> {
    await this.port.lockWritable(tx, ctx.authz, parentId);
    const r = await detachOne(tx, this.port.table, { parentId, attachmentId: i.attachment_id, ifVersion: i.if_version, userId: actorUserId(ctx) ?? null, now: this.now() });
    const topic = `${this.port.table.type}.file_detached`;
    return { result: { attachment_id: r.attachment_id, revision: r.revision }, noUndo: true, events: [{ topic, payload: { [this.port.idField]: parentId, attachment_id: r.attachment_id, revision: r.revision } }] };
  }

  async list(ctx: ActionContext, tx: TenantTx, parentId: string, q: { limit?: number; cursor?: string }) {
    await this.port.readable(tx, ctx.authz, parentId);
    const canWrite = await this.port.writable(tx, ctx.authz, parentId);
    const [page, revision, generated] = await Promise.all([listPage(tx, this.port.sql, parentId, q, canWrite), setRevision(tx, this.port.table.type, parentId), q.cursor || !this.port.generated ? [] : this.port.generated(tx, parentId)]);
    return { result: { files: [...generated, ...page.rows], revision, can_attach: canWrite, next_cursor: page.next_cursor } };
  }

  async previewAttach(ctx: ActionContext, tx: TenantTx, parentId: string, i: AttachIn): Promise<ActionPreview> {
    const { code } = await this.port.readable(tx, ctx.authz, parentId);
    const fileId = handleOf(i.source);
    const f = await tx.file.findUnique({ where: { id: fileId }, select: { name: true, size: true, uploadedBy: true } });
    if (!f || f.uploadedBy !== actorUserId(ctx)) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    return preview('write', `${code} · ${f.name}`, { changes: [{ entity: `${this.port.table.type}_attachment`, after: { file: f.name, bytes: Number(f.size) } }] });
  }

  async previewDetach(ctx: ActionContext, tx: TenantTx, parentId: string, i: { attachment_id: string }): Promise<ActionPreview> {
    const { code } = await this.port.readable(tx, ctx.authz, parentId);
    const row = await this.port.table.find(tx, i.attachment_id);
    if (!row || row.parentId !== parentId || row.detachedAt) throw new AppError('NOT_FOUND', 404, { attachment_id: 'not_found' });
    const f = await tx.file.findUnique({ where: { id: row.fileId }, select: { name: true } });
    return preview('delete', `${code} · ${f?.name ?? ''}`, { changes: [{ entity: `${this.port.table.type}_attachment`, id: row.id, before: { file: f?.name ?? '' } }], warnings: ['file_kept'] });
  }
}
