// Bảng chỉ thêm (TIP-003e §3, DC-292): `stock_movement` / `order_event` / `ticket_event` chặn UPDATE / TRUNCATE luôn, chặn DELETE trừ khi
// transaction đặt cờ `app.undo_allow`. Cờ CHỈ đặt ở đây và chỉ UndoService gọi (nhánh hoàn tác trong cửa sổ 24 giờ) — `SET LOCAL` nên tự
// hết khi commit / rollback, không rò sang transaction khác trên cùng kết nối pool. Cascade từ xoá `order` / `ticket` / `product` lúc
// hoàn tác đi qua cùng cờ. Mọi đường xoá khác (job, handler thường, SQL tay) vẫn bị trigger chặn.
import type { TenantTx } from './action-context';

export async function withUndoAllowance(tx: TenantTx): Promise<void> {
  await tx.$executeRaw`SET LOCAL app.undo_allow = 'on'`;
}
