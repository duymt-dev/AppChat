// Ghi báo giá dùng chung cho handler (transaction của executor — COMMERCE §3): dòng hàng (đơn giá chưa VAT, chiết khấu dòng + tổng,
// thuế sau chiết khấu — quoteTotals), tổng lưu BigInt, khách phải ghi được (D32), phụ trách là thành viên, trường tuỳ biến theo định nghĩa
// `quote` (D56), dòng ngoài danh mục chỉ tính với báo giá AI / agent tạo (buộc duyệt — §12). Hạn hiệu lực = cuối ngày (gửi + N) theo giờ
// workspace (money-time-numbering §2.3).
import { AppError, approvalReasons, dayEndAfter, quoteTotals, validateCustomValues, type AuthzContext, type CustomValues, type Discount, type Totals } from '@appchat/shared';
import { quotePolicy } from '../../settings/policy';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { ActionContext } from '../../../kernel/actions/action-context';
import { uuidv7 } from '../../../kernel/ids';
import { actorUserId, checkOpportunityLink, editableContact, fieldDefs, type CrmMembers } from '../../../crm/public';
import { UUID, type QuoteRecord } from '../quote-access';
import { lockContactRow } from '../../../kernel/ownership/root-lock';

export interface LineIn {
  product_id?: string;
  name: string;
  variant?: string;
  qty: number;
  unit_price: string;
  tax_rate: number;
  discount?: Discount | null;
}

export interface QuoteFieldsIn {
  contact_id?: string;
  owner_user_id?: string;
  items?: LineIn[];
  header_discount?: Discount | null;
  valid_days?: number;
  payment_terms?: string;
  note?: string;
  gift?: string;
  custom?: CustomValues;
  /** TIP-026c: thuộc cơ hội (null = không gắn) + hai cờ áp lúc gửi. */
  opportunity_id?: string | null;
  opportunity_sync_value?: boolean;
  opportunity_follow_up?: boolean;
}

/** Cột cơ hội của báo giá (TIP-026c §1.2): kiểm liên kết cùng họ khách / chưa Thua / người gọi thấy — chỉ những ô input có. */
export async function opportunityCols(tx: TenantTx, authz: AuthzContext, contactId: string, f: Pick<QuoteFieldsIn, 'opportunity_id' | 'opportunity_sync_value' | 'opportunity_follow_up'>) {
  return {
    ...(f.opportunity_id !== undefined ? { opportunityId: await checkOpportunityLink(tx, authz, contactId, f.opportunity_id) } : {}),
    ...(f.opportunity_sync_value !== undefined ? { opportunitySyncValue: f.opportunity_sync_value } : {}),
    ...(f.opportunity_follow_up !== undefined ? { opportunityFollowUp: f.opportunity_follow_up } : {}),
  };
}

export type CreatorType = 'user' | 'agent' | 'assistant';

/** Người tạo theo nguồn: agent → `agent`; Trợ lý / AI soạn → `assistant`; còn lại người dùng. */
export const creatorOf = (ctx: ActionContext, ai = false): CreatorType => (ctx.actor.type === 'agent' ? 'agent' : ai || ctx.source === 'assistant' ? 'assistant' : 'user');

/** Dòng có `product_id` phải trỏ sản phẩm còn sống; trả dòng đã chuẩn hoá + cờ "có dòng ngoài danh mục". */
export async function resolveLines(tx: TenantTx, items: LineIn[]): Promise<{ lines: LineIn[]; offCatalog: boolean }> {
  const ids = [...new Set(items.map((l) => l.product_id).filter((x): x is string => !!x))];
  const bad = ids.filter((id) => !UUID.test(id));
  const found = new Set((ids.length - bad.length ? await tx.product.findMany({ where: { id: { in: ids.filter((id) => UUID.test(id)) }, deletedAt: null }, select: { id: true } }) : []).map((p) => p.id));
  items.forEach((l, i) => {
    if (l.product_id && !found.has(l.product_id)) throw new AppError('VALIDATION_FAILED', 422, { [`items.${i}.product_id`]: 'not_found' });
  });
  const lines = items.map((l) => ({ ...l, name: l.name.trim(), variant: l.variant?.trim() ?? '' }));
  return { lines, offCatalog: lines.some((l) => !l.product_id) };
}

/** Cột tổng (BigInt) từ quoteTotals. */
export function totalCols(t: Totals) {
  return {
    subtotal: BigInt(t.subtotal),
    lineDiscountTotal: BigInt(t.line_discount_total),
    discountTotal: BigInt(t.discount_total),
    taxTotal: BigInt(t.tax_total),
    total: BigInt(t.total),
  };
}

export async function writeLines(tx: TenantTx, quoteId: string, lines: LineIn[], t: Totals, now: Date) {
  await tx.quoteItem.deleteMany({ where: { quoteId } });
  await tx.quoteItem.createMany({
    data: lines.map((l, i) => ({
      id: uuidv7(now.getTime()),
      quoteId,
      productId: l.product_id ?? null,
      name: l.name,
      variant: l.variant ?? '',
      qty: l.qty,
      unitPrice: BigInt(l.unit_price),
      discount: (l.discount ?? undefined) as object | undefined,
      taxRate: l.tax_rate,
      lineTotal: BigInt(t.lines[i]!.net),
      sort: i,
    })),
  });
}

/** Dòng đang lưu → dạng input (tính lại tổng, sao chép sang phiên bản mới). */
export async function linesOf(tx: TenantTx, quoteId: string): Promise<LineIn[]> {
  const rows = await tx.quoteItem.findMany({ where: { quoteId }, orderBy: { sort: 'asc' } });
  return rows.map((r) => ({
    ...(r.productId ? { product_id: r.productId } : {}),
    name: r.name,
    variant: r.variant,
    qty: Number(r.qty),
    unit_price: String(r.unitPrice),
    tax_rate: r.taxRate,
    discount: (r.discount as Discount | null) ?? null,
  }));
}

/** Lý do cần duyệt của bản ghi đang lưu (dòng + chiết khấu tổng) theo ngưỡng workspace (TIP-032b). */
export async function reasonsOf(tx: TenantTx, q: QuoteRecord, ctx?: Pick<ActionContext, 'source'>) {
  const t = quoteTotals(await linesOf(tx, q.id), q.headerDiscount as Discount | null);
  // Trần giảm giá agent áp khi báo giá do agent / Trợ lý tạo HOẶC khi agent / tác vụ đang gửi (TIP-032b — không miễn bằng hội thoại đang phục vụ).
  const creator = ctx && (ctx.source === 'agent' || ctx.source === 'task') ? 'agent' : q.createdByType;
  return approvalReasons(t, { offCatalog: q.offCatalog, ...(await quotePolicy(tx, creator)) });
}

/** Khách ghi được (owner / collaborator / scope) + id phụ trách hợp lệ. */
export async function checkParties(ctx: ActionContext, tx: TenantTx, members: CrmMembers, f: { contactId: string; ownerUserId?: string }) {
  // TIP-015f §2.5: khoá khách gốc TRƯỚC khoá con / ghi quan hệ mới — tuần tự với xoá khách (không tạo nghiệp vụ mới trên khách vừa xoá).
  await lockContactRow(tx, f.contactId);
  const { contact } = await editableContact(tx, ctx.authz, f.contactId);
  if (f.ownerUserId) await members.assertMember(ctx.workspaceId, f.ownerUserId, 'owner_user_id');
  // Mặc định: người tạo (người dùng) → phụ trách của khách → trống.
  const owner = f.ownerUserId ?? (ctx.actor.type === 'user' ? actorUserId(ctx) : null) ?? contact.ownerUserId ?? actorUserId(ctx);
  return { contact, ownerUserId: owner };
}

const roleOf = async (authz: AuthzContext, members: CrmMembers, ws: string, me: string | null) => (authz.isOwner ? 'owner' : await members.roleOf(ws, me));

export async function checkQuoteCustom(ctx: ActionContext, tx: TenantTx, members: CrmMembers, values: CustomValues | undefined, mode: 'create' | 'update') {
  if (mode === 'update' && values === undefined) return;
  const errs = validateCustomValues(await fieldDefs(tx, 'quote'), values, await roleOf(ctx.authz, members, ctx.workspaceId, actorUserId(ctx)), mode);
  if (Object.keys(errs).length) throw new AppError('VALIDATION_FAILED', 422, errs);
}

/** Hạn hiệu lực khi gửi / gia hạn: cuối ngày (mốc + N ngày) theo giờ workspace. */
export const validUntilOf = (from: Date, days: number, timeZone: string) => dayEndAfter(from, days, timeZone);

/** Có phiên bản mới hơn (chưa xoá) cùng chuỗi → bản này không gia hạn / sửa được nữa. */
export async function hasNewerVersion(tx: TenantTx, q: Pick<QuoteRecord, 'rootQuoteId' | 'version'>) {
  return !!(await tx.quote.findFirst({ where: { rootQuoteId: q.rootQuoteId, version: { gt: q.version }, deletedAt: null }, select: { id: true } }));
}

/** Đổi trạng thái có điều kiện (concurrency §2): `WHERE id AND status = from` — 0 dòng → 409. */
export async function moveStatus(tx: TenantTx, q: Pick<QuoteRecord, 'id' | 'status'>, to: QuoteRecord['status'], data: Record<string, unknown>, now: Date) {
  const n = await tx.quote.updateMany({ where: { id: q.id, status: q.status }, data: { ...data, status: to, updatedAt: now } });
  if (!n.count) throw new AppError('INVALID_TRANSITION', 409, { status: q.status });
}
