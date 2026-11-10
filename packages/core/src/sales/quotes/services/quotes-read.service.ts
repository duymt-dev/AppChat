// Đọc domain báo giá cho apps/api (Blueprint §4.4 sales — shape packages/shared/src/api/quotes.ts): danh sách D42 (page + limit,
// deferred join), chi tiết, các phiên bản cùng chuỗi, meta (KPI + chip + panel AI; kèm `quote_id` → thẻ CRM / hoạt động / việc cần làm /
// lịch sử của báo giá đó), PDF (bản đóng băng nếu đã gửi, chưa gửi thì render nháp), trang xem công khai (token ký → `viewed`).
import { AppError, createFmt, vndWords, type AuthzContext, type PublicQuote } from '@appchat/shared';
import { TenantContexts } from '@appchat/db';
import { assertQueryFields, fieldView, projectCustom } from '../../../authz/public';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { UUID, visibleQuote, type QuoteRecord } from '../quote-access';
import { listQuoteIds, type QuoteFilter } from '../repos/quotes.repo';
import { quoteDocData, renderQuotePdf } from './quote-doc';
import type { QuoteDeps } from './quote-deps';
import { readQuoteToken } from './quote-link';
import { aiRuns, quoteInsights, quoteKpis } from './quote-insights';
import { markViewed } from './quote-system';
import type { ActionExecutor } from '../../../kernel/actions/executor';
import { commentsByQuote, contactsOf, itemsByQuote, toQuoteRow, type ViewCtx } from './quote-view';
import { agentDiscountCap, readApprovalPolicy } from '../../settings/policy';

export interface QuoteViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;

export class QuotesReadService {
  constructor(
    private readonly d: QuoteDeps,
    private readonly now: () => Date,
    private readonly executor: Pick<ActionExecutor, 'execute'>,
  ) {}

  private async tx<T>(v: QuoteViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const db = await this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(fn);
  }

  private async ctx(v: QuoteViewer): Promise<Omit<ViewCtx, 'names'>> {
    return { ...(await this.d.viewerPlace(v.workspaceId, v.userId)), now: this.now() };
  }

  /** Bước 2 deferred join: đủ cột + dòng + trao đổi + khách cho đúng các id, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, ids: string[], base: Omit<ViewCtx, 'names'>, a: AuthzContext) {
    if (!ids.length) return [];
    const fv = await fieldView(tx, 'quote', a);
    const [rows, items, comments] = await Promise.all([tx.quote.findMany({ where: { id: { in: ids } } }), itemsByQuote(tx, ids), commentsByQuote(tx, ids)]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const contacts = await contactsOf(tx, rows.map((r) => r.contactId));
    const userIds = [...rows.flatMap((r) => [r.ownerUserId, r.assignedUserId]), ...[...comments.values()].flat().map((c) => c.authorId)];
    const names = await this.d.members.names(userIds);
    // contract_quote_id_key (unique) — tra theo đúng các id của trang.
    const contracted = new Set((await tx.contract.findMany({ where: { quoteId: { in: ids }, deletedAt: null }, select: { quoteId: true } })).map((c) => c.quoteId!));
    const ctx: ViewCtx = { ...base, names, contracted, approval: { policy: await readApprovalPolicy(tx), agentMaxPct: await agentDiscountCap(tx) } };
    // Trường tuỳ biến chỉ còn key người xem được thấy (FieldPolicy — TIP-045b annex C).
    return rows.map((q) => {
      const row = toQuoteRow(q, { items: items.get(q.id) ?? [], contact: contacts.get(q.contactId), comments: comments.get(q.id) ?? [] }, ctx);
      return { ...row, custom: projectCustom(fv, row.custom) };
    });
  }

  async list(v: QuoteViewer, f: QuoteFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      assertQueryFields(await fieldView(tx, 'quote', v.authz), f.custom);
      const { ids, total } = await listQuoteIds(tx, v.authz, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, ids, base, v.authz);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  async get(v: QuoteViewer, id: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => (await this.rowsOf(tx, [(await visibleQuote(tx, v.authz, id)).id], base, v.authz))[0]!);
  }

  /** Các phiên bản cùng chuỗi (kể cả bản cũ), mới nhất trước. */
  async versions(v: QuoteViewer, id: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      const q = await visibleQuote(tx, v.authz, id);
      const rows = await tx.quote.findMany({ where: { rootQuoteId: q.rootQuoteId, deletedAt: null }, orderBy: { version: 'desc' }, select: { id: true } });
      return this.rowsOf(tx, rows.map((r) => r.id), base, v.authz);
    });
  }

  async meta(v: QuoteViewer, quoteId?: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      const k = await quoteKpis(tx, v.authz);
      const runs = await aiRuns(tx, v.authz, k, base);
      const one = quoteId && UUID.test(quoteId) ? await quoteInsights(tx, await visibleQuote(tx, v.authz, quoteId), base) : { crm_stats: [], timeline: [], todos: [], history: [] };
      return { counts: k.counts, stats: k.stats, ...one, ai_runs: runs };
    });
  }

  /** PDF: đã gửi → bản đóng băng (sha256 lưu lúc gửi); chưa gửi → render bản nháp theo mẫu hiện tại. */
  async pdf(v: QuoteViewer, id: string): Promise<{ name: string; pdf: Buffer }> {
    const db = await this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    const q = await db.$transaction((tx) => visibleQuote(tx, v.authz, id));
    return this.pdfOf(db, v.workspaceId, q);
  }

  private async pdfOf(db: Parameters<typeof renderQuotePdf>[0], ws: string, q: QuoteRecord) {
    if (q.fileId && this.d.files) {
      const f = await this.d.files.read(db, q.fileId);
      if (f) return { name: f.row.name, pdf: f.body };
    }
    const r = await renderQuotePdf(db, this.d.doc(), ws, q, q.validUntil);
    return { name: `${q.code}-L${q.version}.pdf`, pdf: r.pdf };
  }

  /** Trang xem công khai: token ký → dữ liệu cho khách (không có ghi chú / trao đổi nội bộ) + ghi nhận lần xem đầu. */
  async publicView(token: string): Promise<PublicQuote> {
    const env = this.d.need('env');
    const t = readQuoteToken(env.key, token);
    if (!t) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    const db = await this.d.need('tenants').get(TenantContexts.system(t.ws, 'quote.public'));
    const q = await db.quote.findUnique({ where: { id: t.quoteId } });
    // Bản nháp / chờ duyệt chưa từng gửi thì khách không xem được.
    if (!q || q.deletedAt || !q.sentAt) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    const now = this.now();
    // TIP-003c: locator đã kiểm chữ ký → action riêng `quote.system_transition` (record_view) theo đúng báo giá + lần gửi hiện tại.
    await markViewed({ executor: this.executor, tenants: this.d.need('tenants'), onError: () => undefined }, t.ws, { id: q.id, sentAt: q.sentAt });
    const doc = await quoteDocData(db, this.d.doc(), t.ws, q, q.validUntil);
    const lines = (await itemsByQuote(db as never, [q.id])).get(q.id) ?? [];
    const totals = doc.totals;
    const fmt = createFmt({ locale: doc.locale, timeZone: doc.timeZone });
    const fresh = (await db.quote.findUnique({ where: { id: q.id }, select: { status: true } }))!;
    return {
      code: q.code,
      version: q.version,
      status: fresh.status,
      business: { name: doc.business.legal_name ?? '', tax_code: doc.business.tax_code ?? '', address: doc.business.address ?? '' },
      customer: doc.data.customer.name ?? '',
      items: lines.map((l, i) => ({ name: l.name, variant: l.variant ?? '', qty: l.qty, unit_price: fmt.money(l.unit_price), discount: doc.data.items[i]?.discount ?? '', tax_rate: l.tax_rate, amount: fmt.money(totals.lines[i]?.net ?? '0') })),
      subtotal: fmt.money(totals.subtotal),
      discount_total: fmt.money(totals.discount_total),
      tax_total: fmt.money(totals.tax_total),
      total: fmt.money(totals.total),
      total_words: vndWords(totals.total, doc.locale),
      valid_until: q.validUntil ? fmt.date(q.validUntil) : null,
      payment_terms: q.paymentTerms,
      gift: q.gift,
      expired: fresh.status === 'expired' || (!!q.validUntil && q.validUntil < now && ['sent', 'viewed'].includes(fresh.status)),
      pdf: !!q.fileId,
    };
  }

  /** PDF công khai (bản đóng băng) theo cùng token. */
  async publicPdf(token: string): Promise<{ name: string; pdf: Buffer }> {
    const t = readQuoteToken(this.d.need('env').key, token);
    if (!t) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    const db = await this.d.need('tenants').get(TenantContexts.system(t.ws, 'quote.public'));
    const q = await db.quote.findUnique({ where: { id: t.quoteId } });
    if (!q || q.deletedAt || !q.sentAt) throw new AppError('NOT_FOUND', 404, { token: 'invalid' });
    return this.pdfOf(db, t.ws, q);
  }
}

