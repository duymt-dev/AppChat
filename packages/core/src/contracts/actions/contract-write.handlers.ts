// contract.create · create_from_quote · update · delete · renew (Blueprint §3.4; COMMERCE §9). Mã `HĐ-{n}` theo sequence; người làm
// hợp đồng lúc tạo ghi `owner_user_id` (doanh số — §8b, bất biến; người phụ trách vận hành `assigned_user_id` — TIP-032c). Sửa / xoá chỉ ở `draft` (CONTRACT_FLOW); xoá = xoá mềm (validation-defaults
// §4.5). "→ Hợp đồng" chỉ từ báo giá đã chốt, mỗi báo giá một hợp đồng. Gia hạn = hợp đồng MỚI (`renewal_of_id`, bắt đầu từ ngày kết
// thúc cũ) — lại qua duyệt + ký.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONTRACT_FLOW, CONTRACT_RENEWABLE, assertTransition } from '@appchat/shared';
import type { ActionInput, contractCreate, contractCreateFromQuote, contractDelete, contractRenew, contractUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { TenantContexts } from '@appchat/db';
import { CrmMembers, actorUserId } from '../../crm/public';
import { linkConversation } from '../../inbox/public';
import { lockConversion } from '../../sales/public';
import type { GuardedDocument } from '../../documents/public';
import { lockContract } from '../contract-access';
import { editContract } from '../editing/contract-edit';
import { undoContractEdit } from '../editing/contract-undo';
import { undoContractDelete } from '../editing/contract-create-undo';
import { contractVersion, lockContractVersion } from '../editing/contract-version';
import { createPreview, deletePreview, fromQuotePreview, renewPreview, updatePreview } from './previews/contract-write.handlers.preview';
import { ContractDeps } from '../services/contract-deps';
import { guardUpload, sourceCols } from '../files/source';
import { createdAfter, insertContract, undoCreate } from './contract-create';
import { lockRootOf } from '../../kernel/ownership/root-lock';

type Out = { contract_id: string; code: string };

@Injectable()
@ActionHandler('contract.create')
export class ContractCreateHandler implements Handler<ActionInput<typeof contractCreate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
    @Inject(ContractDeps) private readonly d: ContractDeps,
  ) {}

  /** Nguồn tệp (TIP-030b spec 2): guard truy cập + kiểm bytes ngoài transaction trước khi tạo. */
  async prepare(ctx: ActionContext, input: ActionInput<typeof contractCreate>): Promise<GuardedDocument | null> {
    if (input.source?.type !== 'file') return null;
    const me = actorUserId(ctx);
    if (!me) throw new AppError('FORBIDDEN', 403, { actor: 'user_required' });
    const db = await this.d.need('tenants').get(TenantContexts.system(ctx.workspaceId, 'contract.create'));
    return guardUpload(db, this.d.need('files'), me, input.source.file_id, this.clock.now());
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contractCreate>, tx: TenantTx, _ptx?: unknown, prepared?: unknown): Promise<HandlerOutcome<Out>> {
    if (input.quote_id) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'use_create_from_quote' });
    const g = prepared as GuardedDocument | null | undefined;
    if (input.source?.type === 'file' && !g) throw new AppError('VALIDATION_FAILED', 422, { file_id: 'not_found' });
    const link = await linkConversation(tx, ctx.authz, input.contact_id, input, { served: ctx.servedConversationId });
    const fields = { ...input, source: undefined, source_message_id: undefined, contact_id: link.contactId!, conversation_id: link.conversationId };
    const c = await insertContract(ctx, tx, this.members, g ? { ...fields, file_name: fields.file_name ?? g.name } : fields, this.clock.now(), 'created', g ? sourceCols(g) : undefined);
    if (g) await tx.file.updateMany({ where: { id: g.fileId }, data: { confirmed: true } });
    return { result: { contract_id: c.id, code: c.code }, after: await createdAfter(tx, c.id) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractCreate>, tx: TenantTx) {
    return createPreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('contract.create_from_quote')
export class ContractFromQuoteHandler implements Handler<ActionInput<typeof contractCreateFromQuote>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractCreateFromQuote>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // COMMERCE §3 / §8: "→ Hợp đồng" chỉ cho báo giá đã chốt; một báo giá → một HĐ hoặc một đơn (TIP-032b conversion-lock: khoá báo giá,
    // đã có đơn → QUOTE_ALREADY_CONVERTED; gọi lại → hợp đồng cũ).
    const { quote: q, existing: dup } = await lockConversion(tx, ctx.authz, input.quote_id, 'contract');
    if (dup) return { result: { contract_id: dup.id, code: dup.code } };
    if (q.status !== 'accepted') throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
    const items = await tx.quoteItem.findMany({ where: { quoteId: q.id }, orderBy: { sort: 'asc' }, select: { name: true } });
    const c = await insertContract(
      ctx,
      tx,
      this.members,
      { contact_id: q.contactId, quote_id: q.id, owner_user_id: q.ownerUserId ?? undefined, kind: 'service', title: items.map((i) => i.name).join(', ').slice(0, 200), value: String(q.total) },
      this.clock.now(),
      'created_from_quote',
    );
    return { result: { contract_id: c.id, code: c.code }, after: await createdAfter(tx, c.id) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractCreateFromQuote>, tx: TenantTx) {
    return fromQuotePreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('contract.update')
export class ContractUpdateHandler implements Handler<ActionInput<typeof contractUpdate>, { contract_id: string; version: number }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string; version: number }>> {
    return editContract(ctx, tx, this.members, input, this.clock.now());
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoContractEdit(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractUpdate>, tx: TenantTx) {
    return updatePreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('contract.delete')
export class ContractDeleteHandler implements Handler<ActionInput<typeof contractDelete>, { contract_id: string }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractDelete>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string }>> {
    const c = await lockContractVersion(tx, ctx.authz, input.contract_id, input.if_version);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.delete');
    await tx.contract.update({ where: { id: c.id }, data: { deletedAt: this.clock.now(), quoteId: null } });
    return { result: { contract_id: c.id }, before: { id: c.id, quote_id: c.quoteId }, after: { after_version: await contractVersion(tx, c.id) } };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoContractDelete(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractDelete>, tx: TenantTx) {
    return deletePreview(ctx, tx, input);
  }
}

@Injectable()
@ActionHandler('contract.renew')
export class ContractRenewHandler implements Handler<ActionInput<typeof contractRenew>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractRenew>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    // TIP-015f §2.5: khách → hợp đồng cũ → hợp đồng gia hạn.
    await lockRootOf(tx, 'contract', input.contract_id);
    const old = await lockContract(tx, ctx.authz, input.contract_id);
    if (!CONTRACT_RENEWABLE.includes(old.status)) throw new AppError('INVALID_TRANSITION', 409, { status: old.status });
    const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
    const c = await insertContract(
      ctx,
      tx,
      this.members,
      { contact_id: old.contactId, renewal_of_id: old.id, owner_user_id: old.ownerUserId ?? undefined, kind: old.kind, title: old.title, value: String(old.value), start_date: iso(old.endDate), note: old.note },
      this.clock.now(),
      'created',
    );
    return { result: { contract_id: c.id, code: c.code }, after: await createdAfter(tx, c.id) };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(ctx, log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractRenew>, tx: TenantTx) {
    return renewPreview(ctx, tx, this.members, input);
  }
}
