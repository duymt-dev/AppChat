// contract.inspect_file · attach_file · create_from_attachment (TIP-030b spec 2–3, 7). Guard tệp + kiểm bytes + trích chữ chạy ở
// `prepare` (ngoài transaction — đọc kho, parser trong worker giới hạn); `execute` khoá / kiểm lại trong transaction rồi ghi cột nguồn
// bất biến. Tệp của tin: kiểm tin / hội thoại / chỉ số đính kèm theo scope hiện hành TRƯỚC khi đọc bytes (prepare dùng transaction
// đọc riêng); khách mặc định = khách của hội thoại, khác khách phải có quyền ghi khách đó và hiện cảnh báo lệch trong preview.
import { Inject, Injectable } from '@nestjs/common';
import { TenantContexts } from '@appchat/db';
import { AppError, CONTRACT_FLOW, assertTransition } from '@appchat/shared';
import type { ActionInput, contractAttachFile, contractCreateFromAttachment, contractInspectFile } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { created, preview, updated } from '../../kernel/actions/preview-kit';
import { CrmMembers, actorUserId, editableContact } from '../../crm/public';
import type { GuardedDocument } from '../../documents/public';
import { lockContract } from '../contract-access';
import { ContractDeps } from '../services/contract-deps';
import { actorNameOf, logSignEvent } from '../services/contract-write';
import { guardAttachment, resolveAttachment } from '../files/attachment-source';
import { extractContract } from '../files/extraction';
import { guardUpload, sourceCols } from '../files/source';
import { createdAfter, insertContract, undoCreate } from './contract-create';

type Db = Awaited<ReturnType<NonNullable<ContractDeps['tenants']>['get']>>;

/** DB tenant + người dùng gốc (guard tệp theo người ra lệnh, kể cả khi Trợ lý / agent làm thay). */
async function intake(d: ContractDeps, ctx: ActionContext, label: string): Promise<{ db: Db; me: string }> {
  const me = actorUserId(ctx);
  if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
  return { db: await d.need('tenants').get(TenantContexts.system(ctx.workspaceId, label)), me };
}

@Injectable()
@ActionHandler('contract.inspect_file')
export class ContractInspectFileHandler implements Handler<ActionInput<typeof contractInspectFile>, unknown> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: ActionInput<typeof contractInspectFile>) {
    const { db, me } = await intake(this.d, ctx, 'contract.inspect_file');
    const g = await guardUpload(db, this.d.need('files'), me, input.file_id, this.clock.now());
    return { g, x: await extractContract(g.type, g.body, g.pages) };
  }

  async execute(_ctx: ActionContext, _input: unknown, _tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<unknown>> {
    const { g, x } = prepared as { g: GuardedDocument; x: Awaited<ReturnType<typeof extractContract>> };
    return { result: { file_id: g.fileId, name: g.name, type: g.type, pages: g.pages ?? null, sha256: g.sha256, extraction: x.extraction, fields: x.fields } };
  }
}

type AttachIn = ActionInput<typeof contractAttachFile>;

@Injectable()
@ActionHandler('contract.attach_file')
export class ContractAttachFileHandler implements Handler<AttachIn, { contract_id: string; source_version: number }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async prepare(ctx: ActionContext, input: AttachIn) {
    const { db, me } = await intake(this.d, ctx, 'contract.attach_file');
    return guardUpload(db, this.d.need('files'), me, input.file_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: AttachIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<{ contract_id: string; source_version: number }>> {
    const g = prepared as GuardedDocument;
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    // Chỉ nháp — hợp đồng đã trình / đã ký không thay nguồn (đã ký → phụ lục).
    assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
    if (c.sourceVersion !== input.if_source_version) throw new AppError('CONFLICT', 409, { source_version: String(c.sourceVersion) });
    const now = this.clock.now();
    const version = c.sourceVersion + 1;
    const before = { source: c.source, sourceFileId: c.sourceFileId, sourceHash: c.sourceHash, sourceMime: c.sourceMime, renderedUnsignedFileId: c.renderedUnsignedFileId, renderedUnsignedHash: c.renderedUnsignedHash, sourceVersion: c.sourceVersion };
    const r = await tx.contract.updateMany({
      where: { id: c.id, status: 'draft', sourceVersion: c.sourceVersion },
      data: { ...sourceCols(g), renderedUnsignedFileId: null, renderedUnsignedHash: null, sourceVersion: version, fileName: g.name, updatedAt: now },
    });
    if (!r.count) throw new AppError('CONFLICT', 409, { source_version: 'stale' });
    await tx.file.updateMany({ where: { id: g.fileId }, data: { confirmed: true } });
    await logSignEvent(tx, { contractId: c.id, type: 'source_attached', actorName: await actorNameOf(ctx, this.members), docSha256: g.sha256, meta: { file: g.name, version }, at: now });
    return { result: { contract_id: c.id, source_version: version }, before, after: { id: c.id, sourceVersion: version } };
  }

  /** Hoàn tác: trả nguồn cũ khi vẫn là nháp và chưa ai thay tiếp (CAS theo version). */
  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const a = log.after as { id: string; sourceVersion: number };
    const b = log.before as Record<string, unknown> & { sourceVersion: number };
    const r = await tx.contract.updateMany({ where: { id: a.id, status: 'draft', sourceVersion: a.sourceVersion }, data: { ...b, sourceVersion: a.sourceVersion + 1, updatedAt: new Date() } as never });
    if (!r.count) throw new AppError('INVALID_TRANSITION', 409, { source_version: 'changed' });
  }

  async preview(ctx: ActionContext, input: AttachIn, tx: TenantTx) {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
    // Chỉ đọc metadata tệp (không bytes) — guard đầy đủ chạy ở prepare của lần thực hiện.
    const f = /^[0-9a-f-]{36}$/i.test(input.file_id) ? await tx.file.findUnique({ where: { id: input.file_id }, select: { name: true } }) : null;
    if (!f) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    return preview('write', `${c.code} · ${c.title}`, { changes: updated('contract', c.id, { file_name: c.fileName, source_version: c.sourceVersion }, { file_name: f.name, source_version: input.if_source_version + 1 }) });
  }
}

type FromAttIn = ActionInput<typeof contractCreateFromAttachment>;
interface AttPrepared {
  g: GuardedDocument;
  ref: Awaited<ReturnType<typeof resolveAttachment>>;
}

@Injectable()
@ActionHandler('contract.create_from_attachment')
export class ContractFromAttachmentHandler implements Handler<FromAttIn, { contract_id: string; code: string }> {
  constructor(
    @Inject(ContractDeps) private readonly d: ContractDeps,
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  private links() {
    const env = this.d.env;
    return env ? { apiBase: env.apiBase, key: env.key } : null;
  }

  /** Ràng buộc tin (scope hiện hành) trước, rồi mới đọc bytes. */
  async prepare(ctx: ActionContext, input: FromAttIn): Promise<AttPrepared> {
    const { db, me } = await intake(this.d, ctx, 'contract.create_from_attachment');
    const ref = await db.$transaction((tx) => resolveAttachment(tx as TenantTx, ctx.authz, this.links(), ctx.workspaceId, input.message_id, input.attachment_idx));
    return { ref, g: await guardAttachment(db, this.d.need('files'), me, ref.fileId, this.clock.now()) };
  }

  async execute(ctx: ActionContext, input: FromAttIn, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<{ contract_id: string; code: string }>> {
    const { g } = prepared as AttPrepared;
    // Kiểm lại trong transaction (quyền / tin có thể đổi giữa prepare và execute).
    const ref = await resolveAttachment(tx, ctx.authz, this.links(), ctx.workspaceId, input.message_id, input.attachment_idx);
    if (ref.fileId !== g.fileId) throw new AppError('CONFLICT', 409, { attachment: 'changed' });
    const contactId = input.contact_id ?? ref.contactId;
    if (!contactId) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'required' });
    const now = this.clock.now();
    const c = await insertContract(ctx, tx, this.members, { contact_id: contactId, kind: input.kind ?? 'service', title: input.title ?? g.name.replace(/\.(pdf|docx)$/i, ''), value: input.value ?? '0', start_date: input.start_date, end_date: input.end_date, file_name: g.name }, now, 'created_from_attachment', {
      ...sourceCols(g),
      originMessageId: ref.messageId,
      originAttachmentIdx: ref.idx,
    });
    await tx.file.updateMany({ where: { id: g.fileId }, data: { confirmed: true } });
    return { result: { contract_id: c.id, code: c.code }, after: await createdAfter(tx, c.id) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: FromAttIn, tx: TenantTx) {
    const ref = await resolveAttachment(tx, ctx.authz, this.links(), ctx.workspaceId, input.message_id, input.attachment_idx);
    const contactId = input.contact_id ?? ref.contactId;
    if (!contactId) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'required' });
    const { contact } = await editableContact(tx, ctx.authz, contactId);
    // Khách chỉ định khác khách của hội thoại → cảnh báo lệch hiện trên thẻ xác nhận (không tự gộp / đổi liên kết).
    const warnings = ref.contactId && contactId !== ref.contactId ? ['contact_mismatch'] : [];
    const owner = await actorNameOf(ctx, this.members);
    return preview('write', `${contact.name} · ${ref.name ?? ''}`, {
      changes: [created('contract', { contact: contact.name, owner, kind: input.kind ?? 'service', title: input.title ?? ref.name ?? undefined, value: input.value ?? '0', file: ref.name ?? undefined })],
      ...(warnings.length ? { warnings } : {}),
    });
  }
}
