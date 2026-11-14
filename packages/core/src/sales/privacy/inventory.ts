// Kiểm kê Bán hàng cho "Quên khách" (TIP-015c §2.3 hàng 10, DC-259): báo giá/đề nghị/khoản thu đã GỬI/XÁC NHẬN = retained_issued
// (giữ bytes/hash, loại khỏi AI/export chung — không xoá). Bản nháp (chưa gửi) = exclusive, xoá được như nội dung vận hành thường.
// TIP-032d §4.2: tệp đính kèm đơn / đề nghị (cả liên kết đã gỡ — lineage chưa giải quyết thì chặn hoàn tất quên khách) = exclusive của
// khách; tệp của đề nghị đã phát hành giữ theo ngoại lệ chứng từ. Gỡ liên kết KHÔNG có nghĩa bytes / bản sao ngoài đã xoá.
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function salesInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`
    SELECT 'quote' AS kind, id AS record_id, version AS revision, 'exclusive' AS ownership, (sent_at IS NOT NULL) AS retained_issued
      FROM quote WHERE contact_id = ANY(${ids})
    UNION ALL
    SELECT 'invoice', id, version, 'exclusive', (sent_at IS NOT NULL OR status <> 'draft')
      FROM invoice WHERE contact_id = ANY(${ids})
    UNION ALL
    SELECT 'customer_payment', id, 1, 'exclusive', (status = 'confirmed')
      FROM customer_payment WHERE contact_id = ANY(${ids})
    UNION ALL
    SELECT 'order_attachment', a.id, a.version, 'exclusive', false
      FROM order_attachment a JOIN "order" o ON o.id = a.order_id WHERE o.contact_id = ANY(${ids})
    UNION ALL
    SELECT 'invoice_attachment', a.id, a.version, 'exclusive', (i.sent_at IS NOT NULL OR i.status <> 'draft')
      FROM invoice_attachment a JOIN invoice i ON i.id = a.invoice_id WHERE i.contact_id = ANY(${ids})`;
  return toInventory(rows);
}
