// Liên kết chứng từ của khách cho Hồ sơ 360° (TIP-015b REQ-F02c, khối Blocks360): báo giá / đơn gần đây, lịch hẹn sắp tới, ticket đang mở +
// SLA phản hồi + CSAT gần nhất. Mỗi nhóm tối đa 3 dòng (bounded), kiểm quyền module + scope từng bản ghi; không quyền → `null` (khối hiện
// "không xem được", khác danh sách rỗng). Index theo khách đã có: quote_contact_idx · order_contact_idx · appointment_contact_idx · ticket_contact_idx.
import { can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { bookingScopeSql } from '../../booking/booking-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { quoteScopeSql } from '../../sales/quotes/quote-access';
import { supportScopeSql } from '../../support/ticket-access';
import { inFamilySql } from '../lifecycle/family-sql';

export const LINKS_LIMIT = 3;

export interface LinkRow {
  id: string;
  code: string;
  title: string;
  status: string;
  amount?: string;
  at: string;
}
export interface CustomerLinks {
  quotes: LinkRow[] | null;
  orders: LinkRow[] | null;
  appts: LinkRow[] | null;
  tickets: LinkRow[] | null;
  /** SLA phản hồi của ticket gần nhất có kết quả (`met` | `breached`) — null khi chưa có / không quyền. */
  sla: { code: string; result: string } | null;
  /** CSAT gần nhất (1–5). */
  csat: { code: string; score: number; at: string } | null;
}

type Tx = Pick<TenantTx, '$queryRaw'>;
type Raw = { id: string; code: string; title: string | null; status: string; amount: bigint | null; at: Date };
const rows = (r: Raw[]): LinkRow[] => r.map((x) => ({ id: x.id, code: x.code, title: x.title ?? '', status: x.status, ...(x.amount === null ? {} : { amount: String(x.amount) }), at: x.at.toISOString() }));

export async function customerLinks(tx: Tx, a: AuthzContext, id: string, now: Date): Promise<CustomerLinks> {
  const [quotes, orders, appts, tickets, sla, csat] = await Promise.all([
    can(a, 'quote.view')
      ? tx.$queryRaw<Raw[]>`SELECT q.id, q.code, NULL::text AS title, q.status::text AS status, q.total AS amount, q.created_at AS at FROM quote q
          WHERE ${inFamilySql('q.contact_id', id)} AND q.deleted_at IS NULL AND ${quoteScopeSql(a)} ORDER BY q.created_at DESC, q.id DESC LIMIT ${LINKS_LIMIT}`.then(rows)
      : null,
    can(a, 'order.view')
      ? tx.$queryRaw<Raw[]>`SELECT o.id, o.code, NULL::text AS title, o.status::text AS status, o.total AS amount, o.created_at AS at FROM "order" o
          WHERE ${inFamilySql('o.contact_id', id)} AND o.deleted_at IS NULL AND ${orderScopeSql(a)} ORDER BY o.created_at DESC, o.id DESC LIMIT ${LINKS_LIMIT}`.then(rows)
      : null,
    can(a, 'booking.view')
      ? tx.$queryRaw<Raw[]>`SELECT a.id, a.code, p.name AS title, a.status::text AS status, NULL::bigint AS amount, a.start_at AS at FROM appointment a
          JOIN product p ON p.id = a.service_id
          WHERE ${inFamilySql('a.contact_id', id)} AND a.deleted_at IS NULL AND a.start_at >= ${now} AND a.status IN ('pending', 'confirmed') AND ${bookingScopeSql(a)}
          ORDER BY a.start_at ASC, a.id ASC LIMIT ${LINKS_LIMIT}`.then(rows)
      : null,
    can(a, 'ticket.view')
      ? tx.$queryRaw<Raw[]>`SELECT t.id, t.code, t.title, t.status::text AS status, NULL::bigint AS amount, t.created_at AS at FROM ticket t
          WHERE ${inFamilySql('t.contact_id', id)} AND t.status <> 'closed' AND ${supportScopeSql(a)} ORDER BY t.created_at DESC, t.id DESC LIMIT ${LINKS_LIMIT}`.then(rows)
      : null,
    can(a, 'ticket.view')
      ? tx.$queryRaw<{ code: string; result: string }[]>`SELECT t.code, t.sla_result AS result FROM ticket t
          WHERE ${inFamilySql('t.contact_id', id)} AND t.sla_result IS NOT NULL AND ${supportScopeSql(a)} ORDER BY t.created_at DESC, t.id DESC LIMIT 1`.then((r) => r[0] ?? null)
      : null,
    can(a, 'ticket.view')
      ? tx.$queryRaw<{ code: string; score: number; at: Date }[]>`SELECT t.code, t.csat AS score, t.updated_at AS at FROM ticket t
          WHERE ${inFamilySql('t.contact_id', id)} AND t.csat IS NOT NULL AND ${supportScopeSql(a)} ORDER BY t.created_at DESC, t.id DESC LIMIT 1`.then((r) => (r[0] ? { code: r[0].code, score: r[0].score, at: r[0].at.toISOString() } : null))
      : null,
  ]);
  return { quotes, orders, appts, tickets, sla, csat };
}
