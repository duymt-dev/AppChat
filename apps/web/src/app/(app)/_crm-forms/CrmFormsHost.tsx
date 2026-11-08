// Host toàn cục cho các modal nghiệp vụ mở từ nơi khác (Hồ sơ 360° — REQ-F11): báo giá, hợp đồng, đơn, ticket, lịch hẹn, gửi email,
// sửa khách / chuyển phụ trách (TIP-025b §D.3), ghi chú / việc / cơ hội (TIP-026b).
// Mounted một lần ở app/(app)/layout.tsx (cạnh AppShell) — các modal export qua index.ts của từng feature
// (PATTERNS_DETECTED, 00-PROJECT-CONTEXT.md SCAN DELTA ver2.1); đặt ở app/ (không phải shared/) vì ESLint boundaries
// cấm `shared` import `feature` — chỉ `app` được phép.
'use client';
import { useQuery } from '@tanstack/react-query';
import { QuoteFormModal } from '@/features/quotes';
import { ContractDrawer, ContractFormModal, contractsMetaQuery, useContractsUi } from '@/features/contracts';
import { OrderEditModal, OrderFormModal } from '@/features/orders';
import { TicketFormModal, ticketsMetaQuery, useTicketsUi } from '@/features/tickets';
import { AppointmentFormModal, calendarMetaQuery, useCalendarUi } from '@/features/calendar';
import { EmailComposeModal } from './EmailComposeModal';
import { ContactFormHost } from './ContactFormHost';
import { FormCommandHost } from './FormCommandHost';
import { ActivityFormHost } from '@/shared/contact-activities';

function ContractDrawerHost() {
  const detailOpen = useContractsUi((s) => !!s.detail);
  const meta = useQuery({ ...contractsMetaQuery(), enabled: detailOpen }).data;
  if (!detailOpen || !meta) return null;
  return <ContractDrawer meta={meta} />;
}

function TicketFormHost() {
  const open = useTicketsUi((s) => s.form);
  const meta = useQuery({ ...ticketsMetaQuery(), enabled: open }).data;
  if (!open || !meta) return null;
  return <TicketFormModal meta={meta} />;
}

function AppointmentFormHost() {
  const open = useCalendarUi((s) => s.form);
  const meta = useQuery({ ...calendarMetaQuery(), enabled: !!open }).data;
  if (!open || !meta) return null;
  return <AppointmentFormModal meta={meta} />;
}

export function CrmFormsHost() {
  return (
    <>
      <FormCommandHost />
      <ContactFormHost />
      <QuoteFormModal />
      <ContractFormModal />
      <ContractDrawerHost />
      <OrderFormModal />
      <OrderEditModal />
      <TicketFormHost />
      <AppointmentFormHost />
      <EmailComposeModal />
      <ActivityFormHost />
    </>
  );
}
