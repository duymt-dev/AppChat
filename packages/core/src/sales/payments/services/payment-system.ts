// Việc hệ thống của khoản thu (Blueprint §1.4 scheduler "công nợ T+1 / T+7", COMMERCE §5 / §6): facade mỏng — TIP-003c chuyển thân
// transaction sang action riêng `invoice.system_transition` / `package.system_transition` (sales/system/*). Nhắc tạo outgoing bền trong
// transaction của action, đẩy hàng gửi sau commit (afterCommit của handler) — người gửi SYSTEM_SENDER, không mượn Owner.
import type { TenantDb } from '@appchat/db';
import type { ReminderCalendarInput } from '../../../kernel/time/reminder-schedule';
import { grantPackagesOnConfirm, overdueInvoices, remindInvoices, type SalesSystemDeps } from '../../system/dispatch';

/** Đề nghị đã gửi / thu một phần mà qua hạn → overdue. Trả số đề nghị đã chuyển. */
export const markOverdue = (db: TenantDb, ws: string, now: Date, timeZone: string, d: SalesSystemDeps) => overdueInvoices(db, ws, now, timeZone, d);

/** Nhắc công nợ T-1 / T+1 / T+7 (mỗi mốc một lần — dời mốc ngoài giờ sang đầu giờ làm việc kế tiếp khi truyền BusinessCalendar). */
export const remindDue = (db: TenantDb, ws: string, now: Date, tzOrCal: ReminderCalendarInput, d: SalesSystemDeps) => remindInvoices(db, ws, now, tzOrCal, d);

/** Consumer `order.confirmed` (event đã lưu): đơn đã thu đủ trước khi xác nhận → sinh liệu trình. */
export const packagesOnConfirm = (d: SalesSystemDeps, ws: string, eventId: string, orderId: string) => grantPackagesOnConfirm(d, ws, eventId, orderId);
