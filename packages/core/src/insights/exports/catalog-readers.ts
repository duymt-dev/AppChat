// Reader xuất Sản phẩm · Đề nghị thanh toán (TIP-038b P3, DC-374 — mở rộng khung xuất 038 pha 3, không exporter thứ hai). Sản phẩm: cùng
// `where` + thứ tự màn Sản phẩm (`snapshotProductIds`), giá vốn CHỈ khi người xuất có `catalog.cost_view` (ô trống — không '0'), tồn là ảnh
// chụp chỉ đọc; mô tả = chữ thuần (phép chiếu) + JSON định dạng schema đóng (TIP-027b — tiêu đề trùng alias nhập 038b để khứ hồi định
// dạng; tài liệu hỏng / null → ô trống, không bịa). Đề nghị thanh toán: scope sales HIỆN TẠI (`invoiceScopeSql`), tiền chuỗi chữ số, không phải hoá đơn GTGT (tên sheet ghi rõ).
import { TenantSql as Prisma } from '@appchat/db';
import { can, serverMessages } from '@appchat/shared';
import { snapshotProductIds, type ProductFilter } from '../../catalog/repos/products.repo';
import { docOf } from '../../catalog/description/view';
import { snapshotInvoiceIds, type InvoiceFilter } from '../../sales/payments/repos/invoices.repo';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';
import { customCell, day, money, stamp } from './export-columns';
import type { ExportDb, ListReader } from './types';

const s = (v: unknown) => (typeof v === 'string' && v ? v : undefined);
const ids = (xs: string[]) => Prisma.join(xs.map((x) => Prisma.sql`${x}::uuid`));
const ordered = <T extends { id: string }>(xs: string[], rows: T[]) => {
  const at = new Map(xs.map((id, i) => [id, i]));
  return rows.sort((a, b) => at.get(a.id)! - at.get(b.id)!);
};

export const productReader: ListReader<ProductFilter> = {
  kind: 'product.export',
  entity: 'product',
  filter: (i) => ({
    category: s(i.category),
    type: s(i.type),
    status: s(i.status),
    q: s(i.q),
    custom: i.custom && typeof i.custom === 'object' ? (i.custom as Record<string, string>) : undefined,
  }),
  snapshot: (tx, _a, f, cap) => snapshotProductIds(tx as never, f, cap),
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'name', header: m.col.name, width: 32 },
    { key: 'type', header: m.col.kind },
    { key: 'category', header: m.col.category, width: 20 },
    { key: 'unit', header: m.col.unit },
    { key: 'price', header: m.col.price },
    { key: 'cost', header: m.col.cost },
    { key: 'tax', header: m.col.taxRate },
    { key: 'stock', header: m.col.stock },
    { key: 'status', header: m.col.status },
    { key: 'description', header: m.col.description, width: 40 },
    { key: 'descriptionDoc', header: m.col.descriptionDoc, width: 40 },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const db = tx as ExportDb & {
      product: { findMany: (q: unknown) => Promise<ProductRow[]> };
      productCategory: { findMany: (q: unknown) => Promise<{ id: string; name: string }[]> };
    };
    const list = ordered(xs, await db.product.findMany({ where: { id: { in: xs }, deletedAt: null } }));
    const cats = new Map(
      (
        await db.productCategory.findMany({
          where: { id: { in: list.map((p) => p.categoryId).filter((x): x is string => !!x) } },
          select: { id: true, name: true },
        })
      ).map((c) => [c.id, c.name]),
    );
    const m = serverMessages(place.locale).insights.export;
    const cost = can(a, 'catalog.cost_view');
    return {
      ids: list.map((p) => p.id),
      rows: list.map((p) => [
        p.code,
        p.name,
        m.productType[p.type as keyof typeof m.productType] ?? p.type,
        cats.get(p.categoryId ?? '') ?? '',
        p.unit,
        money(p.price),
        cost ? money(p.cost) : null,
        p.taxRate,
        p.stock,
        m.productStatus[p.status as keyof typeof m.productStatus] ?? p.status,
        p.description,
        ((d) => (d ? JSON.stringify(d) : null))(docOf(p.descriptionDoc).description_doc),
        stamp(p.createdAt, place.timeZone),
        ...place.custom.map((c) => customCell(p.custom, c.key)),
      ]),
    };
  },
};

type ProductRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  categoryId: string | null;
  unit: string;
  price: bigint;
  cost: bigint | null;
  taxRate: number;
  stock: number | null;
  status: string;
  description: string;
  descriptionDoc: unknown;
  createdAt: Date;
  custom: unknown;
};

export const invoiceReader: ListReader<InvoiceFilter> = {
  kind: 'invoice.export',
  entity: null,
  filter: (i) => ({
    status: s(i.status),
    contactId: s(i.contact_id),
    orderId: s(i.order_id),
    ownerId: s(i.owner_id),
    q: s(i.q),
  }),
  snapshot: (tx, a, f, cap) => snapshotInvoiceIds(tx as never, a, f, cap),
  columns: (m) => [
    { key: 'code', header: m.col.code, width: 14 },
    { key: 'title', header: m.col.title, width: 28 },
    { key: 'contact', header: m.col.contact, width: 26 },
    { key: 'order', header: m.col.order, width: 14 },
    { key: 'kind', header: m.col.kind },
    { key: 'status', header: m.col.status },
    { key: 'amount', header: m.col.amount },
    { key: 'paid', header: m.col.paid },
    { key: 'due', header: m.col.dueDate },
    { key: 'sentAt', header: m.col.sentAt },
    { key: 'createdAt', header: m.col.createdAt },
  ],
  async rows(tx, a, xs, place) {
    if (!xs.length) return { ids: [], rows: [] };
    const db = tx as ExportDb & {
      invoice: { findMany: (q: unknown) => Promise<InvoiceRow[]> };
      order: { findMany: (q: unknown) => Promise<{ id: string; code: string }[]> };
    };
    const live = await tx.$queryRaw<
      { id: string }[]
    >`SELECT i.id FROM invoice i WHERE i.id IN (${ids(xs)}) AND ${invoiceScopeSql(a)}`;
    const list = ordered(xs, await db.invoice.findMany({ where: { id: { in: live.map((r) => r.id) } } }));
    const names = new Map(
      (
        await tx.contact.findMany({
          where: { id: { in: [...new Set(list.map((x) => x.contactId))] } },
          select: { id: true, name: true },
        })
      ).map((c) => [c.id, c.name]),
    );
    const orders = new Map(
      (
        await db.order.findMany({
          where: { id: { in: list.map((x) => x.orderId).filter((x): x is string => !!x) } },
          select: { id: true, code: true },
        })
      ).map((o) => [o.id, o.code]),
    );
    const m = serverMessages(place.locale).insights.export;
    return {
      ids: list.map((x) => x.id),
      rows: list.map((x) => [
        x.code,
        x.title,
        names.get(x.contactId) ?? '',
        orders.get(x.orderId ?? '') ?? '',
        m.invoiceKind[x.kind as keyof typeof m.invoiceKind] ?? x.kind,
        m.invoice[x.status as keyof typeof m.invoice] ?? x.status,
        money(x.amount),
        money(x.paidAmount),
        day(x.dueDate),
        stamp(x.sentAt, place.timeZone),
        stamp(x.createdAt, place.timeZone),
      ]),
    };
  },
};

type InvoiceRow = {
  id: string;
  code: string;
  title: string;
  contactId: string;
  orderId: string | null;
  kind: string;
  status: string;
  amount: bigint;
  paidAmount: bigint;
  dueDate: Date;
  sentAt: Date | null;
  createdAt: Date;
};
