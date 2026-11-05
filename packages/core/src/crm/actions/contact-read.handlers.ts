// contact.get / contact.get_360 (TIP-023b R2 · DC-224): Trợ lý / agent đọc hồ sơ khách. 360 đếm báo giá / đơn / đề nghị thanh toán / ticket /
// lịch hẹn kế tiếp bằng helper scope của từng domain (chỉ phụ thuộc kernel). Khách ngoài scope crm → NOT_FOUND (`visibleContact`); mỗi số đếm
// áp scope + quyền module của chính nó — không có quyền → 0, không lộ bản ghi của người khác chỉ vì cùng khách (TIP-023b "readback").
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, contactGet, contactGet360, profileLayoutSearch } from '@appchat/actions';
import { SYSTEM_LAYOUTS, foldText, type AuthzContext, type PermissionKey } from '@appchat/shared';
import { CLOCK, type Clock } from '../../kernel/clock';
import type { ActionContext, TenantTx } from '../../kernel/actions/action-context';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../kernel/actions/handler';
import { visibleContact } from '../services/access';
import { recentFacts } from '../memory/read';
import { bookingScopeSql } from '../../booking/booking-access';
import { supportScopeSql } from '../../support/ticket-access';
import { quoteScopeSql } from '../../sales/quotes/quote-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';

type ContactRow = Awaited<ReturnType<typeof visibleContact>>['contact'];

function profile(c: ContactRow) {
  return {
    id: c.id,
    code: c.code,
    name: c.name,
    phone: c.phone,
    email: c.email,
    zalo: c.zalo,
    city: c.city,
    stage: c.stage,
    group: c.group,
    owner_user_id: c.ownerUserId,
    points: String(c.pointsBalance),
    tier: c.tierKey ?? 'member',
    total_spent: String(c.totalSpent),
    last_interaction_at: c.lastInteractionAt.toISOString(),
  };
}

const can = (a: AuthzContext, p: PermissionKey) => a.isOwner || a.permissions.has(p);
const n = async (q: Promise<{ n: bigint }[]>) => Number((await q)[0]?.n ?? 0n);

@Injectable()
@ActionHandler('contact.get')
export class ContactGetHandler implements Handler<ActionInput<typeof contactGet>, ReturnType<typeof profile>> {
  async execute(ctx: ActionContext, i: ActionInput<typeof contactGet>, tx: TenantTx): Promise<HandlerOutcome<ReturnType<typeof profile>>> {
    return { result: profile((await visibleContact(tx, ctx.authz, i.contact_id)).contact) };
  }
}

@Injectable()
@ActionHandler('contact.get_360')
export class ContactGet360Handler implements Handler<ActionInput<typeof contactGet360>, unknown> {
  constructor(@Inject(CLOCK) private readonly clock: Clock) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof contactGet360>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const now = this.clock.now();
    const { contact: c } = await visibleContact(tx, ctx.authz, i.contact_id);
    const a = ctx.authz;
    const id = c.id;
    // Index: quote (contact_id) · order / invoice (contact_id) · ticket (contact_id) · appointment (contact_id, start_at).
    const [quotes, orders, invoices, tickets, next, facts] = await Promise.all([
      can(a, 'quote.view') ? n(tx.$queryRaw`SELECT count(*)::bigint AS n FROM quote q WHERE q.contact_id = ${id}::uuid AND q.deleted_at IS NULL AND q.status IN ('draft','pending_approval','approved','sent','viewed','revision_requested') AND ${quoteScopeSql(a)}`) : 0,
      can(a, 'order.view') ? n(tx.$queryRaw`SELECT count(*)::bigint AS n FROM "order" o WHERE o.contact_id = ${id}::uuid AND o.deleted_at IS NULL AND o.status IN ('new','processing') AND ${orderScopeSql(a)}`) : 0,
      can(a, 'invoice.manage') ? n(tx.$queryRaw`SELECT count(*)::bigint AS n FROM invoice i WHERE i.contact_id = ${id}::uuid AND i.status IN ('sent','partial','overdue') AND ${invoiceScopeSql(a)}`) : 0,
      can(a, 'ticket.view') ? n(tx.$queryRaw`SELECT count(*)::bigint AS n FROM ticket t WHERE t.contact_id = ${id}::uuid AND t.status <> 'closed' AND ${supportScopeSql(a)}`) : 0,
      can(a, 'booking.view')
        ? tx.$queryRaw<{ id: string; code: string; start_at: Date; status: string }[]>`SELECT a.id, a.code, a.start_at, a.status::text AS status FROM appointment a
            WHERE a.contact_id = ${id}::uuid AND a.deleted_at IS NULL AND a.start_at >= ${now} AND a.status IN ('pending','confirmed') AND ${bookingScopeSql(a)}
            ORDER BY a.start_at ASC LIMIT 1`
        : Promise.resolve([]),
      // Trí nhớ khách (TIP-015b): cùng quyền crm.view với contact.memory_list — lượt Trợ lý sau dùng lại fact (dị ứng, sở thích).
      recentFacts(tx, id, 20),
    ]);
    const nx = next[0];
    return {
      result: {
        ...profile(c),
        open_quotes: quotes,
        open_orders: orders,
        unpaid_invoices: invoices,
        open_tickets: tickets,
        next_appointment: nx ? { id: nx.id, code: nx.code, start_at: nx.start_at.toISOString(), status: nx.status } : null,
        memory: facts.map((f) => f.fact),
      },
    };
  }
}


type LayoutOut = { layouts: { id: string; name: string; is_system: boolean }[] };

@Injectable()
@ActionHandler('profile_layout.search')
export class ProfileLayoutSearchHandler implements Handler<ActionInput<typeof profileLayoutSearch>, LayoutOut> {
  async execute(_ctx: ActionContext, i: ActionInput<typeof profileLayoutSearch>, tx: TenantTx): Promise<HandlerOutcome<LayoutOut>> {
    // Action đọc không ghi: workspace chưa bù seed (trước TIP-015) vẫn thấy 3 mẫu hệ thống từ hằng số, không upsert ở đây.
    const rows = await tx.profileLayout.findMany({ orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }], take: 200, select: { id: true, name: true, isSystem: true } });
    const seen = new Set(rows.map((r) => r.id));
    const all = [...SYSTEM_LAYOUTS.filter((l) => !seen.has(l.id)).map((l) => ({ id: l.id, name: l.name, is_system: true })), ...rows.map((r) => ({ id: r.id, name: r.name, is_system: r.isSystem }))];
    const f = foldText(i.q ?? '');
    return { result: { layouts: all.filter((l) => !f || foldText(l.name).includes(f)).slice(0, i.limit ?? 10) } };
  }
}
