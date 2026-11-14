// Công nợ theo khách (COMMERCE §5 "Công nợ", TIP-015b) — MỘT công thức cho Hồ sơ 360°, thẻ CRM của hợp đồng và meta danh sách đề nghị thanh
// toán: phải thu = Σ (amount − paid_amount) trên đề nghị còn mở (`sent` · `partial` · `overdue`); quá hạn = phần đó có `due_date` < hôm nay
// (giờ workspace). `paid_amount` đã là tổng khoản thu dương xác nhận của đề nghị → trả một phần không bị cộng hai lần; hoàn tiền không mở lại
// đề nghị (ghi ở đơn + sổ khoản thu). Nháp / huỷ không phải công nợ. Quyền: `invoice.manage` + scope sales từng đề nghị — không có quyền →
// `null` (khác 0 thật: "không xem được"). Index: invoice_contact_idx (contact_id, status) INCLUDE (amount, paid_amount, due_date).
import { TenantSql as Prisma } from '@appchat/db';
import { can, type AuthzContext } from '@appchat/shared';
import type { TenantTx } from '../../kernel/actions/action-context';
import { invoiceScopeSql } from '../../sales/payments/invoice-access';
import { inFamilySql } from '../lifecycle/family-sql';

export interface Debt {
  /** Phải thu còn lại (VND, chuỗi). */
  due: string;
  /** Phần quá hạn (VND, chuỗi). */
  overdue: string;
  /** Số đề nghị còn mở. */
  open: number;
}

export const canSeeDebt = (a: AuthzContext) => can(a, 'invoice.manage');

/** Công nợ của nhiều khách (một truy vấn, không N+1). Khách không có đề nghị mở → không có trong map (= 0). */
export async function debtOf(tx: Pick<TenantTx, '$queryRaw'>, a: AuthzContext, contactIds: string[], today: string): Promise<Map<string, Debt> | null> {
  if (!canSeeDebt(a)) return null;
  if (!contactIds.length) return new Map();
  const rows = await tx.$queryRaw<{ contact_id: string; due: bigint; overdue: bigint; open: bigint }[]>`
    SELECT i.contact_id,
           sum(i.amount - i.paid_amount)::bigint AS due,
           coalesce(sum(i.amount - i.paid_amount) FILTER (WHERE i.due_date < ${today}::date), 0)::bigint AS overdue,
           count(*)::bigint AS open
    FROM invoice i
    WHERE i.contact_id IN (${Prisma.join(contactIds.map((id) => Prisma.sql`${id}::uuid`))})
      AND i.status IN ('sent', 'partial', 'overdue') AND ${invoiceScopeSql(a)}
    GROUP BY i.contact_id`;
  return new Map(rows.map((r) => [r.contact_id, { due: String(r.due), overdue: String(r.overdue), open: Number(r.open) }]));
}

/** Công nợ một khách; không quyền → null; không có đề nghị mở → 0 / 0 / 0. */
export async function customerDebt(tx: Pick<TenantTx, '$queryRaw'>, a: AuthzContext, contactId: string, today: string): Promise<Debt | null> {
  if (!canSeeDebt(a)) return null;
  // TIP-015e: đề nghị giữ id khách gốc sau gộp — cộng cả họ (mỗi đề nghị một lần).
  const [r] = await tx.$queryRaw<{ due: bigint | null; overdue: bigint | null; open: bigint }[]>`
    SELECT sum(i.amount - i.paid_amount)::bigint AS due,
           coalesce(sum(i.amount - i.paid_amount) FILTER (WHERE i.due_date < ${today}::date), 0)::bigint AS overdue,
           count(*)::bigint AS open
    FROM invoice i
    WHERE ${inFamilySql('i.contact_id', contactId)} AND i.status IN ('sent', 'partial', 'overdue') AND ${invoiceScopeSql(a)}`;
  return { due: String(r?.due ?? 0n), overdue: String(r?.overdue ?? 0n), open: Number(r?.open ?? 0n) };
}
