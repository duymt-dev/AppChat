// Reader xuất danh sách Báo giá · Đơn hàng · Hợp đồng (TIP-038 pha 3): chốt id bằng đúng `where` + thứ tự của repo danh sách (snapshot*Ids —
// không copy bộ lọc), dựng dòng theo lô id: lọc lại scope sales HIỆN TẠI + chưa xoá rồi nạp cột theo PK (deferred join). Tiền là chuỗi.
import { TenantSql as Prisma } from '@appchat/db';
import { serverMessages, type AuthzContext } from '@appchat/shared';
import { snapshotQuoteIds, type QuoteFilter } from '../../sales/quotes/repos/quotes.repo';
import { snapshotOrderIds, type OrderFilter } from '../../sales/orders/repos/orders.repo';
import { snapshotContractIds, type ContractFilter } from '../../contracts/repos/contracts.repo';
import { quoteScopeSql } from '../../sales/quotes/quote-access';
import { orderScopeSql } from '../../sales/orders/order-access';
import { contractScopeSql } from '../../contracts/contract-access';
import { customCell, day, money, stamp } from './export-columns';
import type { Cell, ExportDb, ExportPlace, ListReader } from './types';

type In = Record<string, unknown>;
const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const cf = (v: unknown) => (v && typeof v === 'object' ? (v as Record<string, string>) : undefined);
const ids = (xs: string[]) => Prisma.join(xs.map((x) => Prisma.sql`${x}::uuid`));
const ordered = <T extends { id: string }>(xs: string[], rows: T[]) => {
  const at = new Map(xs.map((id, i) => [id, i]));
  return rows.sort((a, b) => at.get(a.id)! - at.get(b.id)!);
};
async function contacts(tx: ExportDb, list: { contactId: string }[]) {
  const rows = await tx.contact.findMany({
    where: { id: { in: [...new Set(list.map((x) => x.contactId))] } },
    select: { id: true, name: true },
  });
  return new Map(rows.map((c) => [c.id, c.name]));
}
const labels = (p: ExportPlace) => serverMessages(p.locale).insights.export;
const custom = (place: ExportPlace, v: unknown): Cell[] => place.custom.map((c) => customCell(v, c.key));

export const quoteReader: ListReader<QuoteFilter> = {
  kind: 'quote.export',
  entity: 'quote',
  filter: (i: In) => ({
    status: s(i.status),
    ownerId: s(i.owner_id),
    contactId: s(i.contact_id),
    returning: s(i.returning),
    q: s(i.q),
    custom: cf(i.custom),
  }),
  snapshot: (tx, a, f, cap) => snapshotQuoteIds(tx as never, a, f, cap),
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'version', header: m.col.version, width: 9 },
    { key: 'contact', header: m.col.contact, width: 26 },
    { key: 'status', header: m.col.status, width: 16 },
    { key: 'owner', header: m.col.owner, width: 20 },
    { key: 'subtotal', header: m.col.subtotal },
    { key: 'discount', header: m.col.discount },
    { key: 'tax', header: m.col.tax },
    { key: 'total', header: m.col.total },
    { key: 'validUntil', header: m.col.validUntil },
    { key: 'sentAt', header: m.col.sentAt },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a: AuthzContext, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const live = await tx.$queryRaw<
      { id: string }[]
    >`SELECT q.id FROM quote q WHERE q.id IN (${ids(xs)}) AND q.deleted_at IS NULL AND ${quoteScopeSql(a)}`;
    const list = ordered(xs, await tx.quote.findMany({ where: { id: { in: live.map((r) => r.id) } } }));
    const [names, people] = [await contacts(tx, list), await place.names(list.map((q) => q.ownerUserId))];
    const m = labels(place);
    return {
      ids: list.map((q) => q.id),
      rows: list.map((q) => [
        q.code,
        q.version,
        names.get(q.contactId) ?? '',
        m.quote[q.status as keyof typeof m.quote] ?? q.status,
        people.get(q.ownerUserId ?? '') ?? '',
        money(q.subtotal),
        money(q.discountTotal),
        money(q.taxTotal),
        money(q.total),
        stamp(q.validUntil, place.timeZone),
        stamp(q.sentAt, place.timeZone),
        stamp(q.createdAt, place.timeZone),
        ...custom(place, q.custom),
      ]),
    };
  },
};

export const orderReader: ListReader<OrderFilter> = {
  kind: 'order.export',
  entity: 'order',
  filter: (i: In) => ({
    chip: s(i.chip),
    ownerId: s(i.owner_id),
    contactId: s(i.contact_id),
    value: s(i.value),
    source: s(i.source),
    q: s(i.q),
    custom: cf(i.custom),
  }),
  snapshot: (tx, a, f, cap) => snapshotOrderIds(tx as never, a, f, cap),
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'contact', header: m.col.contact, width: 26 },
    { key: 'source', header: m.col.source },
    { key: 'status', header: m.col.status },
    { key: 'pay', header: m.col.pay, width: 18 },
    { key: 'owner', header: m.col.owner, width: 20 },
    { key: 'total', header: m.col.total },
    { key: 'paid', header: m.col.paid },
    { key: 'refunded', header: m.col.refunded },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const live = await tx.$queryRaw<
      { id: string }[]
    >`SELECT o.id FROM "order" o WHERE o.id IN (${ids(xs)}) AND o.deleted_at IS NULL AND ${orderScopeSql(a)}`;
    const list = ordered(xs, await tx.order.findMany({ where: { id: { in: live.map((r) => r.id) } } }));
    const [names, people] = [await contacts(tx, list), await place.names(list.map((o) => o.ownerUserId))];
    const m = labels(place);
    return {
      ids: list.map((o) => o.id),
      rows: list.map((o) => [
        o.code,
        names.get(o.contactId) ?? '',
        m.orderSource[o.source as keyof typeof m.orderSource] ?? o.source,
        m.order[o.status as keyof typeof m.order] ?? o.status,
        m.pay[o.payStatus as keyof typeof m.pay] ?? o.payStatus,
        people.get(o.ownerUserId ?? '') ?? '',
        money(o.total),
        money(o.paidTotal),
        money(o.refundedTotal),
        stamp(o.createdAt, place.timeZone),
        ...custom(place, o.custom),
      ]),
    };
  },
};

export const contractReader: ListReader<ContractFilter> = {
  kind: 'contract.export',
  entity: null,
  filter: (i: In) => ({
    status: s(i.status),
    ownerId: s(i.owner_id),
    contactId: s(i.contact_id),
    value: s(i.value),
    q: s(i.q),
  }),
  snapshot: (tx, a, f, cap) => snapshotContractIds(tx as never, a, f, cap),
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'number', header: m.col.number },
    { key: 'title', header: m.col.title, width: 30 },
    { key: 'contact', header: m.col.contact, width: 26 },
    { key: 'kind', header: m.col.kind },
    { key: 'status', header: m.col.status },
    { key: 'owner', header: m.col.owner, width: 20 },
    { key: 'value', header: m.col.value },
    { key: 'signedDate', header: m.col.signedDate },
    { key: 'startDate', header: m.col.startDate },
    { key: 'endDate', header: m.col.endDate },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const live = await tx.$queryRaw<
      { id: string }[]
    >`SELECT c.id FROM contract c WHERE c.id IN (${ids(xs)}) AND c.deleted_at IS NULL AND ${contractScopeSql(a)}`;
    const list = ordered(xs, await tx.contract.findMany({ where: { id: { in: live.map((r) => r.id) } } }));
    const [names, people] = [await contacts(tx, list), await place.names(list.map((c) => c.ownerUserId))];
    const m = labels(place);
    return {
      ids: list.map((c) => c.id),
      rows: list.map((c) => [
        c.code,
        c.number,
        c.title,
        names.get(c.contactId) ?? '',
        m.contractKind[c.kind as keyof typeof m.contractKind] ?? c.kind,
        m.contract[c.status as keyof typeof m.contract] ?? c.status,
        people.get(c.ownerUserId ?? '') ?? '',
        money(c.value),
        day(c.signedDate),
        day(c.startDate),
        day(c.endDate),
        stamp(c.createdAt, place.timeZone),
      ]),
    };
  },
};
