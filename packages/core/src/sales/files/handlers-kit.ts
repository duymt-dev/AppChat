// Bộ handler tệp đính kèm dùng chung cho đơn / đề nghị (TIP-032d §1.2–1.5, §3.3): mỗi domain khai class mỏng truyền `RecordPort` (khoá +
// kiểm quyền cha, bảng liên kết, đọc nhãn). Gắn: `prepare` NGOÀI transaction (sau xác nhận) — tệp tải cho đích: kiểm cấu trúc staging; artifact
// Trợ lý: kiểm lại nguồn + đích rồi sao chép bytes gốc thành tệp mới riêng của đích (artifact-copy) và kiểm cấu trúc → execute khoá khách gốc
// → cha (quyền GHI) → kiểm lại nguồn (artifact) → bộ tệp → claim → liên kết. Xem trước artifact ràng revision + digest nguồn vào xác nhận.
import { randomUUID } from 'node:crypto';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { TenantDbResolver } from '@appchat/db';
import { TenantContexts } from '@appchat/db';
import type { ActionPreview } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import type { HandlerOutcome } from '../../kernel/actions/handler';
import { assertBoundPreview } from '../../kernel/actions/preview-binding';
import { preview } from '../../kernel/actions/preview-kit';
import type { FilesService } from '../../kernel/files/files.service';
import { actorUserId } from '../../crm/public';
import { attachStaged, detachOne, listPage, setRevision, stagedFor, type AttachmentTable, type FileRowOut } from './association';
import { validateStaged } from './validation';
import { copyArtifact, liveFileByDigest, locateSource, sourceFact } from './artifact-copy';

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

/** Kết quả prepare: id tệp gắn được cho đích (handle tải lên, hoặc bản sao mới của artifact) + digest nguồn lúc sao chép. */
type Prepared = { fileId: string; digest?: string };
const COPY_UNAVAILABLE = () => new AppError('VALIDATION_FAILED', 422, { source: 'artifact_copy_unavailable' });

export class AttachmentKit {
  constructor(
    private readonly port: RecordPort,
    private readonly tenants: TenantDbResolver | null,
    private readonly files: FilesService | null,
    private readonly now: () => Date,
  ) {}

  /** Ngoài transaction, sau xác nhận: (artifact → sao chép riêng cho đích) rồi kiểm cấu trúc staging trong tiến trình cô lập (không model, không phí). */
  async prepare(ctx: ActionContext, parentId: string, i: AttachIn): Promise<Prepared | undefined> {
    if (!this.tenants || !this.files) {
      if (i.source.kind === 'assistant_artifact_ref') throw COPY_UNAVAILABLE();
      return undefined;
    }
    const db = await this.tenants.get(TenantContexts.system(ctx.workspaceId, 'record-attachment'));
    if (i.source.kind === 'target_upload_handle') {
      await validateStaged(db, this.files, i.source.file_id, this.now);
      return { fileId: i.source.file_id };
    }
    const me = requireUser(ctx);
    const source = i.source;
    const checkTarget = async (tx: TenantTx) => {
      await this.port.readable(tx, ctx.authz, parentId);
      if (!(await this.port.writable(tx, ctx.authz, parentId))) throw new AppError('SCOPE_FORBIDDEN', 403, { parent: 'read_only' });
    };
    // Khoá thao tác: cùng lượt (idempotency / thẻ xác nhận) chạy lại → cùng bản sao; thiếu cả hai → bản sao mới (không dùng lại của lượt khác).
    const operation = ctx.idempotencyKey ?? ctx.confirmToken ?? randomUUID();
    const fileId = await copyArtifact(db, this.files, { ws: ctx.workspaceId, userId: me, ...(ctx.runId ? { runId: ctx.runId } : {}), operation, source, parentType: this.port.table.type, parentId, checkTarget, reuse: (tx, digest) => liveFileByDigest(tx, this.port.sql, parentId, digest) });
    await validateStaged(db, this.files, fileId, this.now);
    const f = await db.file.findUnique({ where: { id: fileId }, select: { sha256: true } });
    return { fileId, digest: f?.sha256 ?? '' };
  }

  async attach(ctx: ActionContext, tx: TenantTx, parentId: string, i: AttachIn, prepared?: unknown): Promise<HandlerOutcome<unknown>> {
    const me = requireUser(ctx);
    const p = prepared as Prepared | undefined;
    const fileId = i.source.kind === 'target_upload_handle' ? i.source.file_id : p?.fileId;
    if (!fileId) throw COPY_UNAVAILABLE();
    await this.port.lockWritable(tx, ctx.authz, parentId);
    if (i.source.kind === 'assistant_artifact_ref') {
      // Nguồn bị thu hồi / đổi giữa prepare và gắn → không gắn bản sao (bản sao ở lại staging riêng tư, dọn như mồ côi).
      const loc = await locateSource(tx, me, ctx.runId, i.source);
      assertBoundPreview(ctx.previewFacts, sourceFact(i.source, loc.digest));
      if (loc.digest !== p?.digest) throw new AppError('CONFLICT', 409, { source: 'changed' });
    }
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

  /** `names` = tên thành viên theo id (CrmMembers) — một lượt cho cả trang; vắng → tên rỗng (không đoán). */
  async list(ctx: ActionContext, tx: TenantTx, parentId: string, q: { limit?: number; cursor?: string }, names?: (ids: (string | null)[]) => Promise<Map<string, string>>) {
    await this.port.readable(tx, ctx.authz, parentId);
    const canWrite = await this.port.writable(tx, ctx.authz, parentId);
    const [page, revision, generated] = await Promise.all([listPage(tx, this.port.sql, parentId, q, canWrite), setRevision(tx, this.port.table.type, parentId), q.cursor || !this.port.generated ? [] : this.port.generated(tx, parentId)]);
    const rows = [...generated, ...page.rows];
    const who = names ? await names(rows.map((r) => r.created_by)) : new Map<string, string>();
    const files = rows.map((r) => ({ ...r, created_by_name: (r.created_by && who.get(r.created_by)) || '' }));
    return { result: { files, revision, can_attach: canWrite, next_cursor: page.next_cursor } };
  }

  async previewAttach(ctx: ActionContext, tx: TenantTx, parentId: string, i: AttachIn): Promise<ActionPreview> {
    const { code } = await this.port.readable(tx, ctx.authz, parentId);
    const me = actorUserId(ctx);
    if (i.source.kind === 'assistant_artifact_ref') {
      // Đồng ý sao chép: thẻ nêu đúng tệp nguồn + đích; bytes gốc chép sang tệp mới của đích sau xác nhận (artifact giữ nguyên).
      if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
      const loc = await locateSource(tx, me, ctx.runId, i.source);
      const f = await tx.file.findUnique({ where: { id: loc.fileId }, select: { size: true } });
      return preview('write', `${code} · ${loc.name}`, { changes: [{ entity: `${this.port.table.type}_attachment`, after: { file: loc.name, bytes: Number(f?.size ?? 0), source: 'assistant_copy' } }] });
    }
    const f = await tx.file.findUnique({ where: { id: i.source.file_id }, select: { name: true, size: true, uploadedBy: true } });
    if (!f || f.uploadedBy !== me) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    return preview('write', `${code} · ${f.name}`, { changes: [{ entity: `${this.port.table.type}_attachment`, after: { file: f.name, bytes: Number(f.size) } }] });
  }

  /** Ràng revision + digest nguồn artifact vào thẻ xác nhận (TIP-033c §3.1) — đổi nguồn sau xem trước → 409 xem trước lại. Handle: không cần. */
  async bindAttach(ctx: ActionContext, tx: TenantTx, i: AttachIn): Promise<Record<string, string>> {
    const me = actorUserId(ctx);
    if (i.source.kind !== 'assistant_artifact_ref' || !me) return {};
    return sourceFact(i.source, (await locateSource(tx, me, ctx.runId, i.source)).digest);
  }

  async previewDetach(ctx: ActionContext, tx: TenantTx, parentId: string, i: { attachment_id: string }): Promise<ActionPreview> {
    const { code } = await this.port.readable(tx, ctx.authz, parentId);
    const row = await this.port.table.find(tx, i.attachment_id);
    if (!row || row.parentId !== parentId || row.detachedAt) throw new AppError('NOT_FOUND', 404, { attachment_id: 'not_found' });
    const f = await tx.file.findUnique({ where: { id: row.fileId }, select: { name: true } });
    return preview('delete', `${code} · ${f?.name ?? ''}`, { changes: [{ entity: `${this.port.table.type}_attachment`, id: row.id, before: { file: f?.name ?? '' } }], warnings: ['file_kept'] });
  }
}
