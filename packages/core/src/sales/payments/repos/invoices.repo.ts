// Danh sách đề nghị thanh toán (D42 — bảng có số trang, indexing §3–7): bước 1 lấy `id` theo scope sales + lọc, `created_at DESC, id DESC`
// (`invoice_recent_idx` / phụ trách `invoice_owner_idx`), OFFSET / LIMIT; bước 2 nạp đủ cột theo PK (deferred join — read service).
// Tìm: mã (prefix `invoice_code_prefix_idx`), tên khách (trigram 015), tiêu đề không dấu.
import { TenantSql as Prisma } from '@appchat/db';
import { INVOICE_STATUSES, foldText, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../../kernel/actions/action-context';
import { UUID, invoiceScopeSql } from '../invoice-access';

export interface InvoiceFilter {
  status?: string;
  contactId?: string;
  orderId?: string;
  ownerId?: string;
  q?: string;
}

function where(authz: AuthzContext, f: InvoiceFilter): Prisma.Sql {
  const parts: Prisma.Sql[] = [invoiceScopeSql(authz)];
  if (f.status && f.status !== 'all') parts.push((INVOICE_STATUSES as readonly string[]).includes(f.status) ? Prisma.sql`i.status = ${f.status}::invoice_status` : Prisma.sql`FALSE`);
  for (const [col, v] of [['contact_id', f.contactId], ['order_id', f.orderId], ['owner_user_id', f.ownerId]] as const) {
    if (!v || v === 'all') continue;
    parts.push(UUID.test(v) ? Prisma.sql`${Prisma.raw(`i.${col}`)} = ${v}::uuid` : Prisma.sql`FALSE`);
  }
  const q = f.q?.trim();
  if (q) {
    const like = `%${foldText(q).replace(/[\\%_]/g, (x) => `\\${x}`)}%`;
    const code = q.toUpperCase().replace(/[\\%_]/g, (x) => `\\${x}`);
    parts.push(Prisma.sql`(i.code LIKE ${`${code}%`} OR lower(i.code) LIKE ${like}
      OR EXISTS (SELECT 1 FROM contact c WHERE c.id = i.contact_id AND f_unaccent(lower(c.name)) LIKE ${like})
      OR f_unaccent(lower(i.title)) LIKE ${like})`);
  }
  return Prisma.join(parts, ' AND ');
}

/** Xuất danh sách (TIP-038b P3): toàn bộ id trong scope + bộ lọc, cùng thứ tự danh sách — tối đa `cap`. */
export async function snapshotInvoiceIds(tx: TenantTx, authz: AuthzContext, f: InvoiceFilter, cap: number): Promise<string[]> {
  const rows = await tx.$queryRaw<{ id: string }[]>`SELECT i.id FROM invoice i WHERE ${where(authz, f)} ORDER BY i.created_at DESC, i.id DESC LIMIT ${cap}`;
  return rows.map((r) => r.id);
}

export async function listInvoiceIds(tx: TenantTx, authz: AuthzContext, f: InvoiceFilter, page: { offset: number; limit: number } | null) {
  const w = where(authz, f);
  const paging = page ? Prisma.sql`LIMIT ${page.limit} OFFSET ${page.offset}` : Prisma.sql`LIMIT 2000`;
  const [ids, total] = await Promise.all([
    tx.$queryRaw<{ id: string }[]>`SELECT i.id FROM invoice i WHERE ${w} ORDER BY i.created_at DESC, i.id DESC ${paging}`,
    tx.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM invoice i WHERE ${w}`,
  ]);
  return { ids: ids.map((r) => r.id), total: Number(total[0]?.n ?? 0) };
}

/** Thẻ số liệu (đề nghị chưa huỷ trong scope): tổng · đã thu · đang chờ (đã gửi / thu một phần) · quá hạn (còn phải thu). */
export async function invoiceStats(tx: TenantTx, authz: AuthzContext) {
  const s = invoiceScopeSql(authz);
  const [r] = await tx.$queryRaw<{ total: bigint; collected: bigint | null; pending: bigint | null; overdue: bigint | null }[]>`
    SELECT count(*)::bigint AS total,
      sum(i.paid_amount)::bigint AS collected,
      sum(i.amount - i.paid_amount) FILTER (WHERE i.status IN ('sent', 'partial'))::bigint AS pending,
      sum(i.amount - i.paid_amount) FILTER (WHERE i.status = 'overdue')::bigint AS overdue
    FROM invoice i WHERE i.status <> 'void' AND ${s}`;
  return { total: Number(r?.total ?? 0), collected: String(r?.collected ?? 0n), pending: String(r?.pending ?? 0n), overdue: String(r?.overdue ?? 0n) };
}
