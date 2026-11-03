// contract.create · create_from_quote · update · delete · renew (Blueprint §3.4; COMMERCE §9). Mã `HĐ-{n}` theo sequence; người làm
// hợp đồng lúc tạo ghi `owner_user_id` (doanh số — §8b). Sửa / xoá chỉ ở `draft` (CONTRACT_FLOW); xoá = xoá mềm (validation-defaults
// §4.5). "→ Hợp đồng" chỉ từ báo giá đã chốt, mỗi báo giá một hợp đồng. Gia hạn = hợp đồng MỚI (`renewal_of_id`, bắt đầu từ ngày kết
// thúc cũ) — lại qua duyệt + ký.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, CONTRACT_FLOW, CONTRACT_RENEWABLE, assertTransition } from '@appchat/shared';
import type { ActionInput, contractCreate, contractCreateFromQuote, contractDelete, contractRenew, contractUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { nextCode } from '../../kernel/sequence';
import { CrmMembers, actorUserId } from '../../crm/public';
import { pickContractTemplate } from '../../documents/public';
import { lockContract } from '../contract-access';
import { createPreview, deletePreview, fromQuotePreview, renewPreview, updatePreview } from './previews/contract-write.handlers.preview';
import { actorNameOf, checkContractParties, checkDates, fieldCols, logSignEvent, type ContractFields } from '../services/contract-write';

type Out = { contract_id: string; code: string };

interface NewContract extends ContractFields {
  contact_id: string;
  quote_id?: string;
  renewal_of_id?: string;
}

/** Tạo bản nháp (create / create_from_quote / renew). */
async function insertContract(ctx: ActionContext, tx: TenantTx, members: CrmMembers, input: NewContract, now: Date, event: string) {
  const { ownerUserId } = await checkContractParties(ctx, tx, members, { contactId: input.contact_id, ownerUserId: input.owner_user_id });
  const cols = fieldCols(input);
  checkDates(cols.startDate, cols.endDate);
  const id = uuidv7(now.getTime());
  const code = await nextCode(tx, 'contract');
  // Mẫu theo loại hợp đồng → mặc định chung (TIP-030b spec 8). Chưa có mẫu nào vẫn tạo nháp được; duyệt / render báo `template_id: missing`.
  const tpl = await pickContractTemplate(tx, input.kind ?? 'service');
  await tx.contract.create({
    data: {
      id,
      code,
      contactId: input.contact_id,
      quoteId: input.quote_id ?? null,
      renewalOfId: input.renewal_of_id ?? null,
      ownerUserId,
      templateId: tpl?.id ?? null,
      templateVersion: tpl?.version ?? null,
      ...cols,
      createdByType: ctx.actor.type === 'user' ? 'user' : ctx.actor.type,
      createdById: ctx.actor.type === 'agent' ? ctx.actor.id : actorUserId(ctx),
      createdAt: now,
      updatedAt: now,
    },
  });
  await logSignEvent(tx, { contractId: id, type: event, actorName: await actorNameOf(ctx, members), at: now });
  return { id, code };
}

/** Hoàn tác tạo: chỉ khi vẫn là nháp — nhật ký ký là chỉ thêm nên xoá mềm thay vì xoá dòng. */
async function undoCreate(log: ActionLogRow, tx: TenantTx, now: Date) {
  const id = (log.after as { id: string }).id;
  const c = await tx.contract.findUnique({ where: { id }, select: { status: true, quoteId: true } });
  if (c && c.status !== 'draft') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  // Gỡ liên kết báo giá để báo giá tạo được hợp đồng lại (unique quote_id).
  await tx.contract.updateMany({ where: { id }, data: { deletedAt: now, quoteId: null } });
}

@Injectable()
@ActionHandler('contract.create')
export class ContractCreateHandler implements Handler<ActionInput<typeof contractCreate>, Out> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractCreate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    if (input.quote_id) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'use_create_from_quote' });
    const c = await insertContract(ctx, tx, this.members, input, this.clock.now(), 'created');
    return { result: { contract_id: c.id, code: c.code }, after: { id: c.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(log, tx, this.clock.now());
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
    const q = /^[0-9a-f-]{36}$/i.test(input.quote_id) ? await tx.quote.findUnique({ where: { id: input.quote_id } }) : null;
    if (!q || q.deletedAt) throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
    // COMMERCE §8: "→ Hợp đồng" chỉ cho báo giá đã chốt; mỗi báo giá một hợp đồng.
    if (q.status !== 'accepted') throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
    const dup = await tx.contract.findFirst({ where: { quoteId: q.id, deletedAt: null }, select: { id: true, code: true } });
    if (dup) return { result: { contract_id: dup.id, code: dup.code } };
    const items = await tx.quoteItem.findMany({ where: { quoteId: q.id }, orderBy: { sort: 'asc' }, select: { name: true } });
    const c = await insertContract(
      ctx,
      tx,
      this.members,
      { contact_id: q.contactId, quote_id: q.id, owner_user_id: q.ownerUserId ?? undefined, kind: 'service', title: items.map((i) => i.name).join(', ').slice(0, 200), value: String(q.total) },
      this.clock.now(),
      'created_from_quote',
    );
    return { result: { contract_id: c.id, code: c.code }, after: { id: c.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractCreateFromQuote>, tx: TenantTx) {
    return fromQuotePreview(ctx, tx, this.members, input);
  }
}

@Injectable()
@ActionHandler('contract.update')
export class ContractUpdateHandler implements Handler<ActionInput<typeof contractUpdate>, { contract_id: string }> {
  constructor(
    @Inject(CrmMembers) private readonly members: CrmMembers,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute(ctx: ActionContext, input: ActionInput<typeof contractUpdate>, tx: TenantTx): Promise<HandlerOutcome<{ contract_id: string }>> {
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.update');
    const p = input.patch;
    // Khách / báo giá nguồn cố định sau khi tạo (bản ghi chứng từ — đổi khách thì tạo hợp đồng mới).
    if (p.contact_id && p.contact_id !== c.contactId) throw new AppError('VALIDATION_FAILED', 422, { contact_id: 'immutable' });
    if (p.quote_id !== undefined && p.quote_id !== (c.quoteId ?? undefined)) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'immutable' });
    if (p.owner_user_id) await this.members.assertMember(ctx.workspaceId, p.owner_user_id, 'owner_user_id');
    const cols = fieldCols(p);
    checkDates(cols.startDate === undefined ? c.startDate : cols.startDate, cols.endDate === undefined ? c.endDate : cols.endDate);
    const before = { id: c.id, number: c.number, kind: c.kind, title: c.title, value: String(c.value), signedDate: c.signedDate, startDate: c.startDate, endDate: c.endDate, fileName: c.fileName, note: c.note, ownerUserId: c.ownerUserId };
    await tx.contract.update({ where: { id: c.id }, data: { ...cols, ...(p.owner_user_id ? { ownerUserId: p.owner_user_id } : {}), updatedAt: this.clock.now() } });
    return { result: { contract_id: c.id }, before };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as Record<string, unknown> & { id: string; value: string };
    const c = await tx.contract.findUnique({ where: { id: b.id }, select: { status: true } });
    if (c?.status !== 'draft') throw new AppError('INVALID_TRANSITION', 409, { status: c?.status ?? 'missing' });
    const d = (v: unknown) => (v ? new Date(v as string) : null);
    await tx.contract.update({
      where: { id: b.id },
      data: { number: b.number as string, kind: b.kind as 'service', title: b.title as string, value: BigInt(b.value), signedDate: d(b.signedDate), startDate: d(b.startDate), endDate: d(b.endDate), fileName: b.fileName as string, note: b.note as string, ownerUserId: (b.ownerUserId as string | null) ?? null },
    });
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
    const c = await lockContract(tx, ctx.authz, input.contract_id);
    assertTransition(CONTRACT_FLOW, c.status, 'contract.delete');
    await tx.contract.update({ where: { id: c.id }, data: { deletedAt: this.clock.now(), quoteId: null } });
    return { result: { contract_id: c.id }, before: { id: c.id, quote_id: c.quoteId } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    const b = log.before as { id: string; quote_id: string | null };
    // Báo giá đã có hợp đồng khác trong lúc chờ → khôi phục không kèm liên kết báo giá.
    const taken = b.quote_id ? await tx.contract.findFirst({ where: { quoteId: b.quote_id }, select: { id: true } }) : null;
    await tx.contract.update({ where: { id: b.id }, data: { deletedAt: null, quoteId: taken ? null : b.quote_id } });
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
    return { result: { contract_id: c.id, code: c.code }, after: { id: c.id } };
  }

  async undo(_ctx: ActionContext, log: ActionLogRow, tx: TenantTx): Promise<void> {
    await undoCreate(log, tx, this.clock.now());
  }

  async preview(ctx: ActionContext, input: ActionInput<typeof contractRenew>, tx: TenantTx) {
    return renewPreview(ctx, tx, this.members, input);
  }
}
