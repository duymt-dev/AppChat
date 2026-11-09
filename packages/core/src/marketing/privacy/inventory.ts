// Kiểm kê Marketing cho "Quên khách" (TIP-015c §2.3 hàng 8): lịch sử người nhận chiến dịch giữ nguyên (không huỷ đăng ký ngầm) —
// exclusive, scrub cột nhận dạng tự do ở pha sau; không xoá dòng (bằng chứng đã gửi / đã huỷ đăng ký).
import type { TenantTx } from '../../kernel/actions/action-context';
import { idsSql, toInventory, type InvRow } from '../../kernel/privacy/sql';

export async function marketingInventory(tx: TenantTx, contactIds: readonly string[]) {
  const ids = idsSql(contactIds);
  const rows = await tx.$queryRaw<InvRow[]>`SELECT 'campaign_recipient' AS kind, id AS record_id, 1 AS revision, 'exclusive' AS ownership FROM campaign_recipient WHERE contact_id = ANY(${ids})`;
  return toInventory(rows);
}
