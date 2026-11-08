// Port phụ thuộc vòng đời khách — Bán hàng (TIP-015f §2.2, DC-256): chặn = đơn mới / đang xử lý; đề nghị thanh toán đã gửi / thu một phần /
// quá hạn còn phải thu (amount > paid_amount, kể cả đề nghị không gắn đơn); đề nghị nháp (ý định thu chưa chốt — không gọi là công nợ);
// khoản thu / hoàn tiền đang chờ / cần xem lại (kiểm riêng, không bù trừ số âm với phải thu). Cảnh báo (giữ lại): đơn đã đóng, báo giá, liệu
// trình. Tồn tại không theo scope người xem. Index: order_contact_idx, invoice_contact_idx, customer_payment_contact_pending_idx,
// quote_contact_status_idx, customer_package_contact_idx.
import type { ContactLifecyclePort } from '../../kernel/contact-lifecycle/ports';
import { idsSql, toDeps, type DepRow } from '../../kernel/contact-lifecycle/sql';

export const salesLifecyclePort: ContactLifecyclePort = {
  domain: 'sales',
  async dependencies(tx, contactIds) {
    const ids = idsSql(contactIds);
    const rows = await tx.$queryRaw<DepRow[]>`
      SELECT 'open_order' AS kind, count(*) AS n, 'block' AS level FROM "order" WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL AND status IN ('new', 'processing')
      UNION ALL SELECT 'receivable', count(*), 'block' FROM invoice WHERE contact_id = ANY(${ids}) AND status IN ('sent', 'partial', 'overdue') AND amount > paid_amount
      UNION ALL SELECT 'draft_invoice', count(*), 'block' FROM invoice WHERE contact_id = ANY(${ids}) AND status = 'draft'
      UNION ALL SELECT 'pending_payment', count(*), 'block' FROM customer_payment WHERE contact_id = ANY(${ids}) AND status IN ('pending', 'needs_review') AND kind <> 'refund'
      UNION ALL SELECT 'pending_refund', count(*), 'block' FROM customer_payment WHERE contact_id = ANY(${ids}) AND status IN ('pending', 'needs_review') AND kind = 'refund'
      UNION ALL SELECT 'closed_order', count(*), 'warn' FROM "order" WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL AND status IN ('completed', 'cancelled')
      UNION ALL SELECT 'quote', count(*), 'warn' FROM quote WHERE contact_id = ANY(${ids}) AND deleted_at IS NULL
      UNION ALL SELECT 'package', count(*), 'warn' FROM customer_package WHERE contact_id = ANY(${ids})`;
    return toDeps(rows);
  },
  async hasRelations(tx, contactIds) {
    const ids = idsSql(contactIds);
    const [r] = await tx.$queryRaw<{ x: boolean }[]>`SELECT (
      EXISTS (SELECT 1 FROM "order" WHERE contact_id = ANY(${ids})) OR EXISTS (SELECT 1 FROM quote WHERE contact_id = ANY(${ids}))
      OR EXISTS (SELECT 1 FROM invoice WHERE contact_id = ANY(${ids})) OR EXISTS (SELECT 1 FROM customer_payment WHERE contact_id = ANY(${ids}))
      OR EXISTS (SELECT 1 FROM customer_package WHERE contact_id = ANY(${ids}))) AS x`;
    return !!r?.x;
  },
};
