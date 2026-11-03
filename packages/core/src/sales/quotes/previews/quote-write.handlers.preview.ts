// Preview soạn báo giá (TIP-023b R2.8): tạo → khách + phụ trách (theo tên) + số dòng + tổng (chuỗi VND), cảnh báo ngưỡng duyệt (COMMERCE
// §3 — `needs_approval:<lý do>`); sửa → trước / sau chỉ trường đổi (dòng đổi → số dòng + tổng mới); xoá → mã + lần + tổng (bản sửa thì
// báo bản trước quay lại đã gửi); trao đổi nội bộ → nội dung. Chỉ đọc — luật trạng thái kiểm sớm bằng QUOTE_FLOW, execute vẫn kiểm lại.
import type { ActionInput, ActionPreview, quoteComment, quoteCreate, quoteDelete, quoteUpdate } from '@appchat/actions';
import { QUOTE_FLOW, approvalReasons, assertTransition, createFmt, quoteTotals, type Discount, type Totals } from '@appchat/shared';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { created, line, preview, removed, updated } from '../../../kernel/actions/preview-kit';
import { actorUserId, editableContact, type CrmMembers } from '../../../crm/public';
import { visibleQuote, type QuoteRecord } from '../quote-access';
import { linesOf, type LineIn } from '../services/quote-write';

const money = (v: string | bigint) => createFmt({ locale: 'vi' }).money(String(v));

/** `BG-1001 · L2` — mã + lần của báo giá. */
export const label = (q: Pick<QuoteRecord, 'code' | 'version'>) => line(q.code, `L${q.version}`);

/** Báo giá thấy được + kiểm sớm chuyển trạng thái (cùng 404 / 409 như execute) → trạng thái đích. */
export async function flowOf(tx: TenantTx, ctx: ActionContext, id: string, action: string) {
  const q = await visibleQuote(tx, ctx.authz, id);
  return { q, to: assertTransition(QUOTE_FLOW, q.status, action), contact: (await tx.contact.findUnique({ where: { id: q.contactId }, select: { name: true } }))?.name ?? '' };
}

/** Cảnh báo ngưỡng duyệt — dòng ngoài danh mục chỉ tính với báo giá AI / agent tạo (§12). */
export const approvalWarnings = (t: Totals, offCatalog: boolean) => approvalReasons(t, { offCatalog }).map((r) => `needs_approval:${r}`);

/** Lý do cần duyệt của bản đang lưu (dòng + chiết khấu tổng). */
export async function storedWarnings(tx: TenantTx, q: QuoteRecord) {
  return approvalWarnings(quoteTotals(await linesOf(tx, q.id), q.headerDiscount as Discount | null), q.offCatalog);
}

const offCatalogOf = (ctx: ActionContext, lines: LineIn[]) => ctx.actor.type === 'agent' || ctx.source === 'assistant' ? lines.some((l) => !l.product_id) : false;

export async function createPreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof quoteCreate>): Promise<ActionPreview> {
  const { contact } = await editableContact(tx, ctx.authz, i.contact_id);
  const ownerId = i.owner_user_id ?? (ctx.actor.type === 'user' ? actorUserId(ctx) : null) ?? contact.ownerUserId ?? actorUserId(ctx);
  const owner = ownerId ? ((await members.names([ownerId])).get(ownerId) ?? ownerId) : null;
  const t = quoteTotals(i.items, i.header_discount ?? null);
  const warnings = approvalWarnings(t, offCatalogOf(ctx, i.items));
  return preview('write', line(contact.name, money(t.total)), {
    changes: [created('quote', { contact: contact.name, owner, items: i.items.length, discount_total: t.discount_total, total: t.total, valid_days: i.valid_days ?? 15 })],
    ...(warnings.length ? { warnings } : {}),
  });
}

export async function updatePreview(ctx: ActionContext, tx: TenantTx, members: CrmMembers, i: ActionInput<typeof quoteUpdate>): Promise<ActionPreview> {
  const { q } = await flowOf(tx, ctx, i.quote_id, 'quote.update');
  const p = i.patch;
  const header = p.header_discount !== undefined ? p.header_discount : (q.headerDiscount as Discount | null);
  const stored = await linesOf(tx, q.id);
  const t = quoteTotals(p.items ?? stored, header);
  const names = await members.names([q.ownerUserId, p.owner_user_id]);
  const name = (id: string | null | undefined) => (id ? (names.get(id) ?? id) : null);
  const cur = { owner: name(q.ownerUserId), items: stored.length, total: String(q.total), valid_days: q.validDays, note: q.note, gift: q.gift, payment_terms: q.paymentTerms };
  const patch = {
    owner: p.owner_user_id ? name(p.owner_user_id) : undefined,
    items: p.items?.length,
    total: p.items || p.header_discount !== undefined ? t.total : undefined,
    valid_days: p.valid_days,
    note: p.note?.trim(),
    gift: p.gift?.trim(),
    payment_terms: p.payment_terms?.trim(),
  };
  const warnings = approvalWarnings(t, p.items ? q.offCatalog && p.items.some((l) => !l.product_id) : q.offCatalog);
  return preview('write', label(q), { changes: updated('quote', q.id, cur, patch), ...(warnings.length ? { warnings } : {}) });
}

export async function deletePreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteDelete>): Promise<ActionPreview> {
  const { q, contact } = await flowOf(tx, ctx, i.quote_id, 'quote.delete');
  // Bản sửa (lần n > 1) → bản trước quay lại đã gửi (khách vẫn giữ báo giá cũ).
  const prev = q.version > 1 && (await tx.quote.findFirst({ where: { rootQuoteId: q.rootQuoteId, version: q.version - 1, status: 'revision_requested', deletedAt: null }, select: { id: true } })) ? `previous_version:L${q.version - 1}` : null;
  return preview('delete', line(label(q), contact), {
    changes: [removed('quote', q.id, { code: q.code, version: q.version, contact, total: String(q.total) })],
    ...(prev ? { warnings: [prev] } : {}),
  });
}

export async function commentPreview(ctx: ActionContext, tx: TenantTx, i: ActionInput<typeof quoteComment>): Promise<ActionPreview> {
  const q = await visibleQuote(tx, ctx.authz, i.quote_id);
  return preview('write', label(q), { changes: [created('quote_comment', { text: i.text.trim() })] });
}
