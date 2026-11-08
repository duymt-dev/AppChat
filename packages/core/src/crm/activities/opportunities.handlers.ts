// contact_opportunity.create / update / archive (TIP-026b §1.3–1.4, §2). Giá trị kỳ vọng ≠ doanh thu; xác suất do người nhập (không mặc
// định, không đoán). Ghi / xoá tiền cần crm.edit ∩ quote.create (403 khi thiếu — không âm thầm bỏ). Liên kết báo giá: người gọi thấy báo giá
// (quote.view + scope sales) và báo giá thuộc ĐÚNG khách; không tạo / đổi báo giá. won / lost không đổi khách / đơn / kho / điểm / thu tiền.
import { Inject, Injectable } from '@nestjs/common';
import { AppError, type AuthzContext } from '@appchat/shared';
import type { ActionInput, contactOpportunityArchive, contactOpportunityCreate, contactOpportunityUpdate } from '@appchat/actions';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type ActionLogRow, type HandlerOutcome } from '../../kernel/actions/handler';
import { uuidv7 } from '../../kernel/ids';
import { POLICIES, guardRecord } from '../../authz/data-access';
import { authorOf, canWriteAmount, checkSource, checkVersion, writableParent } from './authority';
import { lockRow } from './repository';
import { UUID } from '../services/access';
import { activityEvent, activityTimeline, lockForUndo } from './undo';
import { oppArchivePreview, oppCreatePreview, oppUpdatePreview } from './previews';

type Out = { opportunity_id: string; version: number };
type Patch = ActionInput<typeof contactOpportunityUpdate>['patch'];
const NF = { quote_id: 'invalid' };

function moneyGuard(authz: AuthzContext, p: Partial<Patch>) {
  if (p.amount_vnd !== undefined && !canWriteAmount(authz)) throw new AppError('FORBIDDEN', 403, { amount_vnd: 'forbidden' });
}

/** Báo giá liên kết: người gọi thấy (quote.view + scope sales) và cùng khách. Sai → 422 chung (không lộ tồn tại). */
async function checkQuote(tx: TenantTx, authz: AuthzContext, contactId: string, quoteId: string | null | undefined) {
  if (!quoteId) return;
  if (!(authz.isOwner || authz.permissions.has('quote.view'))) throw new AppError('VALIDATION_FAILED', 422, NF);
  const q = !UUID.test(quoteId) ? null : await tx.quote.findUnique({ where: { id: quoteId }, select: { contactId: true, assignedUserId: true, teamId: true, deletedAt: true } });
  if (!q || q.deletedAt || q.contactId !== contactId) throw new AppError('VALIDATION_FAILED', 422, NF);
  await guardRecord(tx, authz, POLICIES.sales, 'read', { owner: q.assignedUserId, team: q.teamId, contact: q.contactId }, NF).catch(() => {
    throw new AppError('VALIDATION_FAILED', 422, NF);
  });
}

function toData(p: Partial<Patch>) {
  const d: Record<string, unknown> = {};
  if (p.title !== undefined) d.title = p.title.trim();
  if (p.need !== undefined) d.need = p.need;
  if (p.amount_vnd !== undefined) d.amountVnd = p.amount_vnd === null ? null : BigInt(p.amount_vnd);
  if (p.stage !== undefined) d.stage = p.stage;
  if (p.probability !== undefined) d.probability = p.probability;
  if (p.expected_close_date !== undefined) d.expectedCloseDate = p.expected_close_date ? new Date(`${p.expected_close_date}T00:00:00Z`) : null;
  if (p.quote_id !== undefined) d.quoteId = p.quote_id;
  return d;
}

/** Ảnh trước (để hoàn tác) — chỉ cột thật, không suy diễn. */
const snapshot = (o: { title: string; need: string; amountVnd: bigint | null; stage: string; probability: unknown; expectedCloseDate: Date | null; quoteId: string | null; archivedAt: Date | null }) => ({
  title: o.title,
  need: o.need,
  amountVnd: o.amountVnd === null ? null : String(o.amountVnd),
  stage: o.stage,
  probability: o.probability === null ? null : Number(String(o.probability)),
  expectedCloseDate: o.expectedCloseDate?.toISOString() ?? null,
  quoteId: o.quoteId,
  archivedAt: o.archivedAt?.toISOString() ?? null,
});
type Snap = ReturnType<typeof snapshot>;
const fromSnap = (s: Snap) => ({
  title: s.title,
  need: s.need,
  amountVnd: s.amountVnd === null ? null : BigInt(s.amountVnd),
  stage: s.stage as 'open',
  probability: s.probability,
  expectedCloseDate: s.expectedCloseDate ? new Date(s.expectedCloseDate) : null,
  quoteId: s.quoteId,
  archivedAt: s.archivedAt ? new Date(s.archivedAt) : null,
});

async function lockOpp(tx: TenantTx, authz: AuthzContext, id: string, ifVersion?: number) {
  const o = (await lockRow(tx, 'contact_opportunity', id)) ? await tx.contactOpportunity.findUnique({ where: { id } }) : null;
  if (!o) throw new AppError('NOT_FOUND', 404, { opportunity_id: 'not_found' });
  await writableParent(tx, authz, o.contactId);
  checkVersion(o.version, ifVersion);
  return o;
}

@Injectable()
@ActionHandler('contact_opportunity.create')
export class ContactOpportunityCreateHandler implements Handler<ActionInput<typeof contactOpportunityCreate>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityCreate>, tx: TenantTx) {
    return oppCreatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityCreate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    await writableParent(tx, ctx.authz, input.contact_id);
    moneyGuard(ctx.authz, input);
    // Tạo chỉ ở giai đoạn chưa kết thúc — won / lost là cập nhật tường minh sau đó.
    if (input.stage === 'won' || input.stage === 'lost') throw new AppError('VALIDATION_FAILED', 422, { stage: 'terminal_on_create' });
    await checkQuote(tx, ctx.authz, input.contact_id, input.quote_id);
    const src = await checkSource(tx, ctx.authz, input.contact_id, input);
    const a = authorOf(ctx);
    const now = this.clock.now();
    const id = uuidv7(now.getTime());
    await tx.contactOpportunity.create({ data: { id, contactId: input.contact_id, ...(toData(input) as { title: string }), ...src, createdBy: a.userId, actorType: a.actorType, actorId: a.actorId, createdAt: now, updatedAt: now } });
    await activityTimeline(tx, { contactId: input.contact_id, type: 'contact_opportunity', key: 'opportunity_created', ref: { type: 'contact_opportunity', id }, actor: { type: ctx.actor.type, id: a.userId }, at: now });
    return { result: { opportunity_id: id, version: 1 }, after: { id, version: 1 }, events: [activityEvent('contact_opportunity.created', input.contact_id, id, 1)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', a.id, a.version);
    await tx.contactOpportunity.update({ where: { id: a.id }, data: { archivedAt: this.clock.now(), version: { increment: 1 } } });
  }
}

@Injectable()
@ActionHandler('contact_opportunity.update')
export class ContactOpportunityUpdateHandler implements Handler<ActionInput<typeof contactOpportunityUpdate>, Out> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityUpdate>, tx: TenantTx) {
    return oppUpdatePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityUpdate>, tx: TenantTx): Promise<HandlerOutcome<Out>> {
    const o = await lockOpp(tx, ctx.authz, input.opportunity_id, input.if_version);
    // Đã lưu trữ → bất biến tới khi hoàn tác.
    if (o.archivedAt) throw new AppError('CONFLICT', 409, { opportunity_id: 'archived' });
    moneyGuard(ctx.authz, input.patch);
    if (input.patch.quote_id !== undefined) await checkQuote(tx, ctx.authz, o.contactId, input.patch.quote_id);
    const before = snapshot(o);
    const data = toData(input.patch);
    // Không đổi gì thật → trả version hiện tại, không sự kiện (so trên ảnh chuẩn hoá).
    const next = snapshot({ ...o, ...(data as Partial<typeof o>) });
    if (JSON.stringify(next) === JSON.stringify(before)) return { result: { opportunity_id: o.id, version: o.version } };
    const now = this.clock.now();
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { ...data, version: { increment: 1 }, updatedAt: now } });
    await activityTimeline(tx, { contactId: o.contactId, type: 'contact_opportunity', key: 'opportunity_updated', ref: { type: 'contact_opportunity', id: o.id }, actor: { type: ctx.actor.type, id: authorOf(ctx).userId }, at: now, ...(data.stage ? { state: String(data.stage) } : {}) });
    return { result: { opportunity_id: o.id, version: o.version + 1 }, before: { id: o.id, version: o.version + 1, ...before }, after: { id: o.id, version: o.version + 1 }, events: [activityEvent('contact_opportunity.updated', o.contactId, o.id, o.version + 1)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const b = log.before as { id: string; version: number } & Snap;
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', b.id, b.version);
    await tx.contactOpportunity.update({ where: { id: b.id }, data: { ...fromSnap(b), version: { increment: 1 }, updatedAt: this.clock.now() } });
  }
}

@Injectable()
@ActionHandler('contact_opportunity.archive')
export class ContactOpportunityArchiveHandler implements Handler<ActionInput<typeof contactOpportunityArchive>, Out & { archived: true }> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async preview(ctx: ActionContext, input: ActionInput<typeof contactOpportunityArchive>, tx: TenantTx) {
    return oppArchivePreview(tx, ctx.authz, input);
  }

  async execute(ctx: ActionContext, input: ActionInput<typeof contactOpportunityArchive>, tx: TenantTx) {
    const o = await lockOpp(tx, ctx.authz, input.opportunity_id, input.if_version);
    if (o.archivedAt) return { result: { opportunity_id: o.id, version: o.version, archived: true as const } };
    const now = this.clock.now();
    await tx.contactOpportunity.update({ where: { id: o.id }, data: { archivedAt: now, version: { increment: 1 } } });
    await activityTimeline(tx, { contactId: o.contactId, type: 'contact_opportunity', key: 'opportunity_archived', ref: { type: 'contact_opportunity', id: o.id }, actor: { type: ctx.actor.type, id: authorOf(ctx).userId }, at: now });
    return { result: { opportunity_id: o.id, version: o.version + 1, archived: true as const }, after: { id: o.id, version: o.version + 1 }, events: [activityEvent('contact_opportunity.archived', o.contactId, o.id, o.version + 1)] };
  }

  async undo(ctx: ActionContext, log: ActionLogRow, tx: TenantTx) {
    const a = log.after as { id: string; version: number };
    await lockForUndo(tx, ctx.authz, 'contact_opportunity', a.id, a.version);
    await tx.contactOpportunity.update({ where: { id: a.id }, data: { archivedAt: null, version: { increment: 1 } } });
  }
}
