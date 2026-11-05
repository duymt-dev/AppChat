// Đọc domain đơn hàng cho apps/api (Blueprint §4.4 sales — shape packages/shared/src/api/orders.ts): danh sách D42 (page + limit,
// deferred join), chi tiết, meta (chip + KPI + panel AI; kèm `order_id` → thẻ CRM / nhận định / tệp của đơn đó).
import { TenantContexts } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { assertQueryFields, fieldView, projectCustom } from '../../../authz/public';
import type { TenantTx } from '../../../kernel/actions/action-context';
import type { QuoteDeps } from '../../quotes/services/quote-deps';
import { UUID, visibleOrder } from '../order-access';
import { listOrderIds, type OrderFilter } from '../repos/orders.repo';
import { orderInsights, orderKpis, orderRuns } from './order-insights';
import { actorIds, contactsOf, eventsByOrder, itemsByOrder, sourceCodes, toOrderRow, type ViewCtx } from './order-view';

export interface OrderViewer {
  workspaceId: string;
  userId: string;
  authz: AuthzContext;
}

const MAX_LIMIT = 100;

export class OrdersReadService {
  constructor(
    private readonly d: QuoteDeps,
    private readonly now: () => Date,
  ) {}

  private async tx<T>(v: OrderViewer, fn: (tx: TenantTx) => Promise<T>): Promise<T> {
    const db = await this.d.need('tenants').get(TenantContexts.fromMembership(v.workspaceId, v.userId));
    return db.$transaction(fn);
  }

  private async ctx(v: OrderViewer): Promise<Omit<ViewCtx, 'names'>> {
    return { ...(await this.d.viewerPlace(v.workspaceId, v.userId)), now: this.now() };
  }

  /** Bước 2 deferred join: đủ cột + dòng + nhật ký + khách cho đúng các id, giữ thứ tự bước 1. */
  private async rowsOf(tx: TenantTx, ids: string[], base: Omit<ViewCtx, 'names'>, a: AuthzContext) {
    if (!ids.length) return [];
    const fv = await fieldView(tx, 'order', a);
    const [rows, items, events] = await Promise.all([tx.order.findMany({ where: { id: { in: ids } } }), itemsByOrder(tx, ids), eventsByOrder(tx, ids)]);
    const order = new Map(ids.map((id, i) => [id, i]));
    rows.sort((a, b) => order.get(a.id)! - order.get(b.id)!);
    const [contacts, codes] = await Promise.all([contactsOf(tx, rows.map((r) => r.contactId)), sourceCodes(tx, rows)]);
    const names = await this.d.members.names([...rows.map((r) => r.ownerUserId), ...actorIds(events.values())]);
    const ctx: ViewCtx = { ...base, names };
    // Trường tuỳ biến chỉ còn key người xem được thấy (FieldPolicy — TIP-045b annex C).
    return rows.map((o) => {
      const row = toOrderRow(o, { items: items.get(o.id) ?? [], contact: contacts.get(o.contactId), events: events.get(o.id) ?? [], codes }, ctx);
      return { ...row, custom: projectCustom(fv, row.custom) };
    });
  }

  async list(v: OrderViewer, f: OrderFilter, page?: number, limit?: number) {
    const lim = Math.min(MAX_LIMIT, Math.max(1, limit ?? 20));
    const paged = page !== undefined;
    const pg = Math.max(1, page ?? 1);
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      assertQueryFields(await fieldView(tx, 'order', v.authz), f.custom);
      const { ids, total } = await listOrderIds(tx, v.authz, f, paged ? { offset: (pg - 1) * lim, limit: lim } : null);
      const data = await this.rowsOf(tx, ids, base, v.authz);
      const pages = Math.max(1, Math.ceil(total / lim));
      return { data, next_cursor: paged && pg < pages ? String(pg + 1) : null, meta: { total, page: paged ? pg : 1, limit: paged ? lim : data.length } };
    });
  }

  async get(v: OrderViewer, id: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => (await this.rowsOf(tx, [(await visibleOrder(tx, v.authz, id)).id], base, v.authz))[0]!);
  }

  async meta(v: OrderViewer, orderId?: string) {
    const base = await this.ctx(v);
    return this.tx(v, async (tx) => {
      const k = await orderKpis(tx, v.authz);
      const one = orderId && UUID.test(orderId) ? await visibleOrder(tx, v.authz, orderId) : null;
      const [runs, ins] = await Promise.all([orderRuns(tx, v.authz, base, k.counts.all), orderInsights(tx, one, base)]);
      return { counts: k.counts, stats: k.stats, ...ins, ai_runs: runs };
    });
  }
}
