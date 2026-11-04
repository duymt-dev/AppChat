// Bản ghi báo giá → dòng API (`quoteRowSchema` — packages/shared/src/api/quotes.ts). Tiền là string VND; tổng tính lại bằng quoteTotals
// từ dòng lưu (khớp FE). Hạn: đã gửi = `valid_until` lưu; chưa gửi = dự kiến nếu gửi hôm nay. Gợi ý cột AI là luật theo trạng thái /
// hạn (không gọi LLM — chữ theo locale người xem).
import { approvalReasons, type ApprovalPolicy, daysLeft, dayEndAfter, quoteTotals, serverMessages, interpolate, type CustomValues, type Discount, type QuoteRow } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { LineIn } from './quote-write';
import type { QuoteRecord } from '../quote-access';

export interface ViewCtx {
  locale: string;
  timeZone: string;
  now: Date;
  names: Map<string, string>;
  /** Ngưỡng duyệt workspace + trần agent (TIP-032b) — đọc một lần mỗi trang; thiếu → mặc định luật. */
  approval?: { policy: ApprovalPolicy; agentMaxPct: number };
  /** Báo giá đã sinh hợp đồng (chưa xoá) trong trang — `converted: 'contract'` (TIP-032b, một báo giá → một HĐ hoặc một đơn). */
  contracted?: Set<string>;
}

type Contact = { id: string; name: string; phone: string | null; stage: string; lastOrderAt: Date | null };

const EXPIRING_DAYS = 2;

function hintOf(q: QuoteRecord, reasons: string[], ctx: ViewCtx): { hint: string; wait: boolean } {
  const h = serverMessages(ctx.locale).sales.quote.hint;
  switch (q.status) {
    case 'draft':
      return reasons.length ? { hint: h.needApproval, wait: true } : { hint: h.draft, wait: false };
    case 'pending_approval':
      return { hint: h.pending, wait: true };
    case 'approved':
      return { hint: h.approved, wait: true };
    case 'sent':
    case 'viewed': {
      const n = q.validUntil ? daysLeft(ctx.now, q.validUntil, ctx.timeZone) : 99;
      if (n <= EXPIRING_DAYS) return { hint: interpolate(h.expiring, { n: Math.max(0, n) }), wait: true };
      return { hint: q.status === 'viewed' ? h.viewed : h.sent, wait: false };
    }
    case 'revision_requested':
      return { hint: h.revision, wait: false };
    case 'accepted':
      return { hint: h.accepted, wait: false };
    case 'rejected':
      return { hint: h.rejected, wait: false };
    default:
      return { hint: h.expired, wait: q.status === 'expired' };
  }
}

/** Dòng hàng của nhiều báo giá (một câu). */
export async function itemsByQuote(tx: TenantTx, ids: string[]): Promise<Map<string, LineIn[]>> {
  const rows = ids.length ? await tx.quoteItem.findMany({ where: { quoteId: { in: ids } }, orderBy: [{ quoteId: 'asc' }, { sort: 'asc' }] }) : [];
  const out = new Map<string, LineIn[]>();
  for (const r of rows) {
    const list = out.get(r.quoteId) ?? [];
    list.push({
      ...(r.productId ? { product_id: r.productId } : {}),
      name: r.name,
      variant: r.variant,
      qty: Number(r.qty),
      unit_price: String(r.unitPrice),
      tax_rate: r.taxRate,
      discount: (r.discount as Discount | null) ?? null,
    });
    out.set(r.quoteId, list);
  }
  return out;
}

export async function commentsByQuote(tx: TenantTx, ids: string[]) {
  const rows = ids.length ? await tx.quoteComment.findMany({ where: { quoteId: { in: ids } }, orderBy: { createdAt: 'asc' } }) : [];
  const out = new Map<string, { authorId: string | null; body: string; at: Date }[]>();
  for (const r of rows) out.set(r.quoteId, [...(out.get(r.quoteId) ?? []), { authorId: r.authorId, body: r.body, at: r.createdAt }]);
  return out;
}

export async function contactsOf(tx: TenantTx, ids: string[]): Promise<Map<string, Contact>> {
  const rows = ids.length ? await tx.contact.findMany({ where: { id: { in: [...new Set(ids)] } }, select: { id: true, name: true, phone: true, stage: true, lastOrderAt: true } }) : [];
  return new Map(rows.map((c) => [c.id, c]));
}

export function toQuoteRow(
  q: QuoteRecord,
  x: { items: LineIn[]; contact: Contact | undefined; comments: { authorId: string | null; body: string; at: Date }[] },
  ctx: ViewCtx,
): QuoteRow {
  const header = (q.headerDiscount as Discount | null) ?? null;
  const t = quoteTotals(x.items, header);
  const a = ctx.approval;
  const reasons = approvalReasons(t, { offCatalog: q.offCatalog, ...(a ? { policy: a.policy, ...(q.createdByType === 'user' ? {} : { agentMaxPct: a.agentMaxPct }) } : {}) });
  const validUntil = q.validUntil ?? dayEndAfter(ctx.now, q.validDays, ctx.timeZone);
  return {
    id: q.id,
    code: q.code,
    version: q.version,
    root_id: q.rootQuoteId,
    contact_id: q.contactId,
    contact_name: x.contact?.name ?? '',
    phone: x.contact?.phone ?? '',
    returning: !!x.contact && (x.contact.stage === 'won' || !!x.contact.lastOrderAt),
    owner_user_id: q.ownerUserId ?? '',
    owner_name: (q.ownerUserId && ctx.names.get(q.ownerUserId)) || '',
    status: q.status,
    items: x.items,
    header_discount: header,
    valid_days: q.validDays,
    created_at: q.createdAt.toISOString(),
    sent_at: q.sentAt?.toISOString() ?? null,
    valid_until: validUntil.toISOString(),
    note: q.note,
    gift: q.gift,
    payment_terms: q.paymentTerms,
    comments: x.comments.map((c) => ({ who: (c.authorId && ctx.names.get(c.authorId)) || '', text: c.body, at: c.at.toISOString() })),
    ai: hintOf(q, reasons, ctx),
    off_catalog: q.offCatalog,
    subtotal: t.subtotal,
    discount_total: t.discount_total,
    header_discount_total: t.header_discount_total,
    tax_total: t.tax_total,
    total: t.total,
    lines: t.lines,
    approval_reasons: reasons,
    converted: q.orderId ? 'order' : ctx.contracted?.has(q.id) ? 'contract' : null,
    custom: (q.custom ?? {}) as CustomValues,
  };
}
