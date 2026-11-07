// Preview soạn hợp đồng (TIP-023b R2.8): tạo / từ báo giá / gia hạn → khách + người làm (theo tên) + tiêu đề + giá trị (chuỗi VND) + ngày;
// từ báo giá đã có hợp đồng → báo trả lại hợp đồng cũ (`existing:<mã>`); sửa → trước / sau chỉ trường đổi; xoá → mã + tiêu đề + giá trị
// (báo giá nguồn được gỡ để tạo lại). Chỉ đọc — luật trạng thái kiểm sớm bằng CONTRACT_FLOW, execute khoá dòng và kiểm lại.
import type { ActionInput, ActionPreview, contractCreate, contractCreateFromQuote, contractDelete, contractRenew, contractUpdate } from '@appchat/actions';
import { AppError, CONTRACT_FLOW, CONTRACT_RENEWABLE, assertTransition, createFmt } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, defined, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { actorUserId, editableContact, type CrmMembers } from '../../../crm/public';
import { visibleContract, type ContractRecord } from '../../contract-access';

export const money = (v: string | bigint) => createFmt({ locale: 'vi' }).money(String(v));
const day = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

/** `HĐ-1001 · Liệu trình 10 buổi` — mã + tiêu đề. */
export const label = (c: Pick<ContractRecord, 'code' | 'title'>) => line(c.code, c.title);

/** Hợp đồng thấy được + kiểm sớm chuyển trạng thái (cùng 404 / 409 như execute) → trạng thái đích + tên khách. */
export async function flowOf(tx: TenantTx, ctx: ActionContext, id: string, action: string) {
  const c = await visibleContract(tx, ctx.authz, id, 'write');
  return { c, to: assertTransition(CONTRACT_FLOW, c.status, action), contact: (await tx.contact.findUnique({ where: { id: c.contactId }, select: { name: true } }))?.name ?? '' };
}

/** Người làm mặc định như execute: người tạo (người dùng) → phụ trách của khách → người gọi. */
async function ownerName(ctx: ActionContext, members: CrmMembers, given: string | null | undefined, contactOwner: string | null) {
  const id = given ?? (ctx.actor.type === 'user' ? actorUserId(ctx) : null) ?? contactOwner ?? actorUserId(ctx);
  return id ? ((await members.names([id])).get(id) ?? id) : null;
}

async function draftPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, f: { contact_id: string; owner_user_id?: string | null; title?: string; value?: string; kind?: string; start_date?: string | null; end_date?: string; renewal_of?: string; quote?: string }) {
  const { contact } = await editableContact(tx, ctx.authz, f.contact_id);
  const owner = await ownerName(ctx, members, f.owner_user_id, contact.ownerUserId);
  const after = { contact: contact.name, owner, kind: f.kind, title: f.title?.trim(), value: f.value ?? '0', start_date: f.start_date ?? undefined, end_date: f.end_date, quote: f.quote, renewal_of: f.renewal_of };
  return preview('write', line(contact.name, f.title?.trim(), money(f.value ?? '0')), { changes: [created('contract', after)] });
}

export async function createPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof contractCreate>): Promise<ActionPreview> {
  if (i.quote_id) throw new AppError('VALIDATION_FAILED', 422, { quote_id: 'use_create_from_quote' });
  return draftPreview(ctx, tx, members, i);
}

export async function fromQuotePreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof contractCreateFromQuote>): Promise<ActionPreview> {
  const q = /^[0-9a-f-]{36}$/i.test(i.quote_id) ? await tx.quote.findUnique({ where: { id: i.quote_id } }) : null;
  if (!q || q.deletedAt) throw new AppError('NOT_FOUND', 404, { quote_id: 'not_found' });
  if (q.status !== 'accepted') throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
  const dup = await tx.contract.findFirst({ where: { quoteId: q.id, deletedAt: null }, select: { code: true, title: true } });
  if (dup) return preview('write', label(dup), { changes: [], warnings: [`existing:${dup.code}`] });
  const items = await tx.quoteItem.findMany({ where: { quoteId: q.id }, orderBy: { sort: 'asc' }, select: { name: true } });
  const title = items.map((x) => x.name).join(', ').slice(0, 200);
  return draftPreview(ctx, tx, members, { contact_id: q.contactId, owner_user_id: q.ownerUserId, kind: 'service', title, value: String(q.total), quote: `${q.code} · L${q.version}` });
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof contractUpdate>): Promise<ActionPreview> {
  const { c } = await flowOf(tx, ctx, i.contract_id, 'contract.update');
  const p = i.patch;
  const names = await members.names([c.ownerUserId, p.owner_user_id]);
  const name = (id: string | null | undefined) => (id ? (names.get(id) ?? id) : null);
  const cur = { number: c.number, kind: c.kind, title: c.title, value: String(c.value), signed_date: day(c.signedDate), start_date: day(c.startDate), end_date: day(c.endDate), file_name: c.fileName, note: c.note, owner: name(c.ownerUserId) };
  const patch = defined({ number: p.number?.trim(), kind: p.kind, title: p.title?.trim(), value: p.value, signed_date: p.signed_date, start_date: p.start_date, end_date: p.end_date, file_name: p.file_name?.trim(), note: p.note?.trim(), owner: p.owner_user_id ? name(p.owner_user_id) : undefined });
  return preview('write', label(c), { changes: updated('contract', c.id, cur, patch) });
}

export async function deletePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof contractDelete>): Promise<ActionPreview> {
  const { c, contact } = await flowOf(tx, ctx, i.contract_id, 'contract.delete');
  return preview('delete', line(label(c), contact), { changes: [removed('contract', c.id, { code: c.code, title: c.title, contact, value: String(c.value) })] });
}

export async function renewPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof contractRenew>): Promise<ActionPreview> {
  const old = await visibleContract(tx, ctx.authz, i.contract_id, 'write');
  if (!CONTRACT_RENEWABLE.includes(old.status)) throw new AppError('INVALID_TRANSITION', 409, { status: old.status });
  return draftPreview(ctx, tx, members, { contact_id: old.contactId, owner_user_id: old.ownerUserId, kind: old.kind, title: old.title, value: String(old.value), start_date: day(old.endDate), renewal_of: old.code });
}
