// Đăng ký quan sát tồn ticket (TIP-034d): handler action đọc + nguồn `$ref` GenUI (lịch sử chiếu lại số đã lưu CHỈ khi tập đóng góp còn
// chứng minh được — không tính lại, không thay số mới). Gắn vào SupportModule (API + ROLE=ai + ROLE=jobs).
import type { TenantDb } from '@appchat/db';
import type { AuthzContext } from '@appchat/shared';
import { registerRefSource } from '../../ai/assistant/genui/refs';
import { TicketStockSummaryHandler } from './handler';
import { stockResultReadable } from './projection';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const STOCK_HANDLERS = [TicketStockSummaryHandler];

/** `$ref` của kết quả `ticket.stock_summary`: số đã lưu nếu tập đóng góp còn đó, nguồn chưa bị "Quên khách", ticket vẫn trong scope. */
export async function stockRefSource(db: TenantDb, v: { userId: string; authz: AuthzContext }, output: unknown): Promise<unknown | null> {
  const id = (output as { result_id?: unknown } | null)?.result_id;
  if (typeof id !== 'string' || !UUID.test(id)) return null;
  return (await stockResultReadable(db, v.authz, id)) ? output : null;
}

export function registerTicketStock(): void {
  registerRefSource('ticket.stock_summary', stockRefSource);
}
