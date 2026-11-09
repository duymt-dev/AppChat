// order.search / order.get (TIP-023b R2 · DC-224): Trợ lý / agent đọc từng đơn. Cùng `listOrderIds` (scope + chip như màn Đơn hàng) và
// `visibleOrder` (ngoài scope → NOT_FOUND). Tối đa 20 dòng; tiền là string VND; không trả thông tin vận chuyển / ghi chú nội bộ.
import { Inject, Injectable } from '@nestjs/common';
import type { ActionInput, orderGet, orderSearch } from '@appchat/actions';
import type { ActionContext, TenantTx } from '../../../kernel/actions/action-context';
import { CrmMembers } from '../../../crm/public';
import { ActionHandler, type ActionHandler as Handler, type HandlerOutcome } from '../../../kernel/actions/handler';
import { contactsOf } from '../../quotes/services/quote-view';
import { visibleOrder, type OrderRecord } from '../order-access';
import { listOrderIds } from '../repos/orders.repo';

function hit(o: OrderRecord, contact: string, people: Map<string, string>) {
  const name = (id: string | null) => (id ? (people.get(id) ?? '') : '');
  return { id: o.id, code: o.code, contact_id: o.contactId, contact, status: o.status, pay_status: o.payStatus, total: String(o.total), paid_total: String(o.paidTotal), created_at: o.createdAt.toISOString(), owner_user_id: o.ownerUserId, owner_name: name(o.ownerUserId), assigned_user_id: o.assignedUserId, assigned_name: name(o.assignedUserId), version: o.version };
}

type SearchOut = { orders: ReturnType<typeof hit>[]; total: number };

@Injectable()
@ActionHandler('order.search')
export class OrderSearchHandler implements Handler<ActionInput<typeof orderSearch>, SearchOut> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof orderSearch>, tx: TenantTx): Promise<HandlerOutcome<SearchOut>> {
    const f = { ...(i.q ? { q: i.q } : {}), ...(i.contact_id ? { contactId: i.contact_id } : {}), ...(i.chip ? { chip: i.chip } : {}) };
    const { ids, total } = await listOrderIds(tx, ctx.authz, f, { offset: 0, limit: i.limit ?? 10 });
    const rows = ids.length ? await tx.order.findMany({ where: { id: { in: ids } } }) : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const [names, people] = await Promise.all([contactsOf(tx, rows.map((r) => r.contactId)), this.members.names(rows.flatMap((r) => [r.ownerUserId, r.assignedUserId]))]);
    const orders = ids.flatMap((id) => {
      const o = byId.get(id);
      return o ? [hit(o, names.get(o.contactId)?.name ?? '', people)] : [];
    });
    return { result: { orders, total } };
  }
}

@Injectable()
@ActionHandler('order.get')
export class OrderGetHandler implements Handler<ActionInput<typeof orderGet>, unknown> {
  constructor(@Inject(CrmMembers) private readonly members: CrmMembers) {}

  async execute(ctx: ActionContext, i: ActionInput<typeof orderGet>, tx: TenantTx): Promise<HandlerOutcome<unknown>> {
    const o = await visibleOrder(tx, ctx.authz, i.order_id);
    const [items, names, people] = await Promise.all([tx.orderItem.findMany({ where: { orderId: o.id }, orderBy: { sort: 'asc' } }), contactsOf(tx, [o.contactId]), this.members.names([o.ownerUserId, o.assignedUserId])]);
    return {
      result: {
        ...hit(o, names.get(o.contactId)?.name ?? '', people),
        items: items.map((x) => ({ product_id: x.productId, name: x.name, qty: Number(x.qty), unit_price: String(x.unitPrice), amount: String(x.lineTotal) })),
        deposit_amount: String(o.depositAmount),
        quote_id: o.quoteId,
        contract_id: o.contractId,
      },
    };
  }
}
