// Đăng ký toàn cục 6 (+3 hoạt động CRM TIP-026b) lệnh điền form của Trợ lý (TIP-025b §D.3) — mounted một lần trong CrmFormsHost: `prefill:contact|quote|contract|
// order|ticket|appointment.form` chạy cả khi màn domain chưa mở (form mở qua host toàn cục). Lệnh mở / lọc vẫn theo màn. Không mount
// màn domain, không import component nội bộ của feature (chỉ hàm công khai qua barrel).
'use client';
import { prefillContactForm } from '@/features/customers';
import { prefillQuotesForm } from '@/features/quotes';
import { prefillContractsForm } from '@/features/contracts';
import { prefillOrdersForm } from '@/features/orders';
import { prefillTicketsForm } from '@/features/tickets';
import { prefillCalendarForm } from '@/features/calendar';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { ACTIVITY_PREFILL } from '@/shared/contact-activities';

export function FormCommandHost() {
  useUiCommand('prefill:contact.form', prefillContactForm);
  useUiCommand('prefill:quote.form', prefillQuotesForm);
  useUiCommand('prefill:contract.form', prefillContractsForm);
  useUiCommand('prefill:order.form', prefillOrdersForm);
  useUiCommand('prefill:ticket.form', prefillTicketsForm);
  useUiCommand('prefill:appointment.form', prefillCalendarForm);
  // TIP-026b: ghi chú / việc / cơ hội (danh sách cố định — số hook không đổi giữa các lần render).
  useUiCommand(ACTIVITY_PREFILL[0]![0], ACTIVITY_PREFILL[0]![1]);
  useUiCommand(ACTIVITY_PREFILL[1]![0], ACTIVITY_PREFILL[1]![1]);
  useUiCommand(ACTIVITY_PREFILL[2]![0], ACTIVITY_PREFILL[2]![1]);
  return null;
}
