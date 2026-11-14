// Chuyển trạng thái báo giá do hệ thống (state-machine §1.4): facade mỏng — TIP-003c chuyển thân transaction sang action riêng
// `quote.system_transition` (sales/system/*: hiệu ứng + nguồn + quét keyset), chạy qua ActionExecutor với capability gắn nguồn + biên
// nhận trigger. Chuyển phụ trách kèm báo giá: port `quote` (ownership-port.ts, TIP-015d) cùng transaction với khách.
import type { TenantDb } from '@appchat/db';
import type { ReminderCalendarInput } from '../../../kernel/time/reminder-schedule';
import { expireQuotes, recordQuoteView, remindQuotes, type SalesSystemDeps } from '../../system/dispatch';

/** Khách mở link (locator đã kiểm): ghi lần xem đầu. */
export const markViewed = (d: SalesSystemDeps, ws: string, q: { id: string; sentAt: Date | null }) => recordQuoteView(d, ws, q);

/** Báo giá đã gửi quá hạn → expired. Trả số bản ghi đã chuyển. */
export const expireDue = (db: TenantDb, ws: string, now: Date, d: SalesSystemDeps) => expireQuotes(db, ws, now, d);

/** Nhắc T-2 (COMMERCE §3 "Job nhắc khi còn 2 ngày" — dời mốc ngoài giờ sang đầu giờ làm việc kế tiếp khi truyền BusinessCalendar). */
export const remindExpiring = (db: TenantDb, ws: string, now: Date, tzOrCal: ReminderCalendarInput, d: SalesSystemDeps) => remindQuotes(db, ws, now, tzOrCal, d);
