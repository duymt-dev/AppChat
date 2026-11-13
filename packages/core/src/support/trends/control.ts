// Khoá điều phối quan sát tồn ticket (TIP-034d §3.1) — singleton `ticket_stock_control` FOR UPDATE, dùng chung cho chụp, dọn cache và
// "Quên khách". Thứ tự khoá toàn cục: khoá họ khách của privacy (lockFamily) → khoá này → xoá dòng quan sát. Chụp CHỈ giữ khoá này và đọc
// nguồn KHÔNG khoá dòng (không bao giờ lấy khoá họ khách sau khoá này) → không đảo thứ tự, không deadlock với "Quên khách".
import type { TenantTx } from '../../kernel/actions/action-context';

/** Lấy khoá control trong transaction hiện tại (READ COMMITTED). Thiếu dòng (DB chưa migrate) → false, người gọi coi là chưa sẵn sàng. */
export async function lockStockControl(tx: Pick<TenantTx, '$queryRaw'>): Promise<boolean> {
  const rows = await tx.$queryRaw<{ id: number }[]>`SELECT id FROM ticket_stock_control WHERE id = 1 FOR UPDATE`;
  return rows.length === 1;
}

/** Giới hạn kỹ thuật cho lần chụp (không phải SLA nghiệp vụ): chờ khoá 2 giây, câu lệnh 30 giây — quá → lần chụp lỗi, thử lại lượt sau. */
export async function captureTimeouts(tx: Pick<TenantTx, '$executeRaw'>): Promise<void> {
  await tx.$executeRaw`SET LOCAL lock_timeout = '2s'`;
  await tx.$executeRaw`SET LOCAL statement_timeout = '30s'`;
}

/** Bảng quan sát chưa có ở DB tenant (lệch schema một phiên bản) — 42P01 undefined_table. */
export function isMissingStockSchema(err: unknown): boolean {
  const e = err as { code?: string; meta?: { code?: string }; message?: string } | null;
  const code = e?.meta?.code ?? e?.code;
  return code === '42P01' || /relation "ticket_stock_\w+" does not exist/.test(e?.message ?? '');
}
