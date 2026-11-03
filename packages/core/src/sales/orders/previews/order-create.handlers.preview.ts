// Preview tạo đơn (TIP-023b R2.8): thủ công / từ báo giá / từ hợp đồng → khách + người phụ trách (theo tên) + số dòng + tổng + cọc (chuỗi
// VND) + nguồn; báo giá đã có đơn → báo trả lại đơn cũ (`existing:<mã>`); cọc vượt tổng → 422 như execute. Chỉ đọc — luật nguồn (báo giá
// đã chốt / hợp đồng đã ký) kiểm sớm, execute khoá dòng và kiểm lại.
import type { ActionInput, ActionPreview, orderCreate, orderCreateFromContract, orderCreateFromQuote } from '@appchat/actions';
import { AppError, createFmt, type Discount } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview } from '../../../kernel/actions/preview-kit';
import { actorUserId, editableContact, type CrmMembers } from '../../../crm/public';
import { linesOf, type LineIn } from '../../quotes/services/quote-write';
import { UUID, type OrderRecord } from '../order-access';
import { totalsOf } from '../services/order-write';

export const money = (v: string | bigint) => createFmt({ locale: 'vi' }).money(String(v));

/** `DH-1001 · Chị Lan` — mã + khách. */
export const label = async (tx: TenantTx, o: Pick<OrderRecord, 'code' | 'contactId'>) => line(o.code, (await tx.contact.findUnique({ where: { id: o.contactId }, select: { name: true } }))?.name);

export interface DraftOrder {
  contact_id: string;
  owner_user_id?: string | null;
  items: LineIn[];
  header_discount?: Discount | null;
  deposit_amount?: string;
  source: string;
  from?: string;
}

/** Đơn sắp tạo — cùng mặc định người phụ trách + kiểm cọc như `insertOrder`. */
export async function draftOrderPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, d: DraftOrder): Promise<ActionPreview> {
  const { contact } = await editableContact(tx, ctx.authz, d.contact_id);
  const t = totalsOf(d.items, d.header_discount);
  const deposit = d.deposit_amount ?? '0';
  if (BigInt(deposit) > BigInt(t.total)) throw new AppError('VALIDATION_FAILED', 422, { deposit_amount: 'over_total' });
  const ownerId = d.owner_user_id ?? (ctx.actor.type === 'user' ? actorUserId(ctx) : null) ?? contact.ownerUserId ?? actorUserId(ctx);
  const owner = ownerId ? ((await members.names([ownerId])).get(ownerId) ?? ownerId) : null;
  return preview('write', line(contact.name, money(t.total)), {
    changes: [created('order', { contact: contact.name, owner, source: d.source, from: d.from, items: d.items.length, total: t.total, deposit: deposit === '0' ? undefined : deposit })],
  });
}

export async function createPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderCreate>): Promise<ActionPreview> {
  let from: string | undefined;
  if (i.contract_id) {
    const c = UUID.test(i.contract_id) ? await tx.contract.findUnique({ where: { id: i.contract_id }, select: { code: true, contactId: true, deletedAt: true } }) : null;
    if (!c || c.deletedAt || c.contactId !== i.contact_id) throw new AppError('VALIDATION_FAILED', 422, { contract_id: 'not_found' });
    from = c.code;
  }
  return draftOrderPreview(ctx, tx, members, { ...i, source: i.contract_id ? 'contract' : 'manual', from });
}

export async function fromQuotePreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderCreateFromQuote>): Promise<ActionPreview> {
  const q = UUID.test(i.quote_id) ? await tx.quote.findUnique({ where: { id: i.quote_id } }) : null;
  if (!q || q.deletedAt) throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
  const dup = await tx.order.findFirst({ where: { quoteId: q.id }, select: { code: true, contactId: true } });
  if (dup) return preview('write', await label(tx, dup), { changes: [], warnings: [`existing:${dup.code}`] });
  if (q.status !== 'accepted') throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
  return draftOrderPreview(ctx, tx, members, { contact_id: q.contactId, owner_user_id: q.ownerUserId, items: await linesOf(tx, q.id), header_discount: q.headerDiscount as Discount | null, source: 'quote', from: `${q.code} · L${q.version}` });
}

export async function fromContractPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof orderCreateFromContract>): Promise<ActionPreview> {
  const c = UUID.test(i.contract_id) ? await tx.contract.findUnique({ where: { id: i.contract_id } }) : null;
  if (!c || c.deletedAt) throw new AppError('NOT_FOUND', 404, { contract_id: 'not_found' });
  if (c.status !== 'signed') throw new AppError('INVALID_TRANSITION', 409, { status: c.status });
  const q = c.quoteId ? await tx.quote.findUnique({ where: { id: c.quoteId }, select: { id: true, headerDiscount: true } }) : null;
  const items = q ? await linesOf(tx, q.id) : [{ name: c.title.trim() || c.code, qty: 1, unit_price: String(c.value), tax_rate: 0 as const }];
  return draftOrderPreview(ctx, tx, members, { contact_id: c.contactId, owner_user_id: c.ownerUserId, items, header_discount: (q?.headerDiscount as Discount | null) ?? null, source: 'contract', from: c.code });
}
