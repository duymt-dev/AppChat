// Host toàn cục cho các modal nghiệp vụ mở từ nơi khác (Hồ sơ 360° — REQ-F11): báo giá, hợp đồng, đơn, ticket, lịch hẹn, gửi email,
// sửa khách / chuyển phụ trách (TIP-025b §D.3), ghi chú / việc / cơ hội (TIP-026b).
// Mounted một lần ở app/(app)/layout.tsx (cạnh AppShell); đặt ở app/ (không phải shared/) vì ESLint boundaries cấm `shared` import
// `feature` — chỉ `app` được phép. TIP-001b §3.1: layout chỉ nạp TĨNH store + lệnh Trợ lý (module lá); mỗi modal / drawer nạp ĐỘNG khi
// mở lần đầu (`lazyDrawer` + `Opened`) — không còn kéo màn của mọi module vào JS khởi đầu của mọi trang.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useQuotesUi } from '@/features/quotes/quotes-store';
import { contractsMetaQuery } from '@/features/contracts/api';
import { useContractsUi } from '@/features/contracts/contracts-store';
import { useOrdersUi } from '@/features/orders/orders-store';
import { ticketsMetaQuery } from '@/features/tickets/api';
import { useTicketsUi } from '@/features/tickets/tickets-store';
import { calendarMetaQuery } from '@/features/calendar/api';
import { useCalendarUi } from '@/features/calendar/calendar-store';
import { useActivityUi } from '@/shared/contact-activities/activity-store';
import { useOpportunityUi } from '@/shared/opportunities/opportunity-store';
import { useEmailComposeUi } from '@/shared/crm-forms/email-compose-store';
import { useContactEditUi } from '@/shared/crm-forms/contact-edit-command';
import { Opened, lazyDrawer } from '@/shared/dynamic/lazy-drawers';
import { FormCommandHost } from './FormCommandHost';

const QuoteFormModal = lazyDrawer(() => import('@/features/quotes').then((m) => m.QuoteFormModal));
const ContractFormModal = lazyDrawer(() => import('@/features/contracts').then((m) => m.ContractFormModal));
const ContractDrawer = lazyDrawer(() => import('@/features/contracts').then((m) => m.ContractDrawer));
const OrderFormModal = lazyDrawer(() => import('@/features/orders').then((m) => m.OrderFormModal));
const OrderEditModal = lazyDrawer(() => import('@/features/orders').then((m) => m.OrderEditModal));
const TicketFormModal = lazyDrawer(() => import('@/features/tickets').then((m) => m.TicketFormModal));
const AppointmentFormModal = lazyDrawer(() => import('@/features/calendar').then((m) => m.AppointmentFormModal));
const EmailComposeModal = lazyDrawer(() => import('./EmailComposeModal').then((m) => m.EmailComposeModal));
const ContactFormHost = lazyDrawer(() => import('./ContactFormHost').then((m) => m.ContactFormHost));
const ActivityFormHost = lazyDrawer(() => import('@/shared/contact-activities').then((m) => m.ActivityFormHost));

function ContractDrawerHost() {
  const detailOpen = useContractsUi((s) => !!s.detail);
  const meta = useQuery({ ...contractsMetaQuery(), enabled: detailOpen }).data;
  return (
    <Opened name="contract-drawer" when={detailOpen && !!meta} onClose={() => useContractsUi.getState().set({ detail: null })}>
      {meta ? <ContractDrawer meta={meta} /> : null}
    </Opened>
  );
}

function TicketFormHost() {
  const open = useTicketsUi((s) => s.form);
  const meta = useQuery({ ...ticketsMetaQuery(), enabled: open }).data;
  return (
    <Opened name="ticket-form" when={open && !!meta} keep={false} onClose={() => useTicketsUi.getState().set({ form: false, prefill: null })}>
      {meta ? <TicketFormModal meta={meta} /> : null}
    </Opened>
  );
}

function AppointmentFormHost() {
  const open = useCalendarUi((s) => s.form);
  const meta = useQuery({ ...calendarMetaQuery(), enabled: !!open }).data;
  return (
    <Opened name="appointment-form" when={!!open && !!meta} keep={false} onClose={() => useCalendarUi.getState().set({ form: null, prefill: null })}>
      {meta ? <AppointmentFormModal meta={meta} /> : null}
    </Opened>
  );
}

export function CrmFormsHost() {
  const quote = useQuotesUi((s) => !!s.form);
  const contract = useContractsUi((s) => !!s.form);
  const order = useOrdersUi((s) => s.form);
  const email = useEmailComposeUi((s) => !!s.target);
  const contact = useContactEditUi((s) => !!s.target);
  const activity = useActivityUi((s) => !!s.form || !!s.list);
  // TIP-026c: drawer Cơ hội 360° mount trong ActivityFormHost — mở khi có cơ hội (thẻ 360°, cột Khách hàng, lệnh Trợ lý).
  const opportunity = useOpportunityUi((s) => !!s.drawer);
  return (
    <>
      <FormCommandHost />
      <Opened name="contact-form" when={contact} keep={false} onClose={() => useContactEditUi.getState().close()}>
        <ContactFormHost />
      </Opened>
      <Opened name="quote-form" when={quote} keep={false} onClose={() => useQuotesUi.getState().set({ form: null, prefill: null, editId: null })}>
        <QuoteFormModal />
      </Opened>
      <Opened name="contract-form" when={contract} keep={false} onClose={() => useContractsUi.getState().set({ form: null, prefill: null, editId: null })}>
        <ContractFormModal />
      </Opened>
      <ContractDrawerHost />
      <Opened name="order-form" when={order === 'create'} keep={false} onClose={() => useOrdersUi.getState().set({ form: null, prefill: null, editId: null })}>
        <OrderFormModal />
      </Opened>
      <Opened name="order-edit" when={order === 'edit'} keep={false} onClose={() => useOrdersUi.getState().set({ form: null, editId: null })}>
        <OrderEditModal />
      </Opened>
      <TicketFormHost />
      <AppointmentFormHost />
      <Opened name="email-compose" when={email} keep={false} onClose={() => useEmailComposeUi.getState().close()}>
        <EmailComposeModal />
      </Opened>
      <Opened name="activity" when={activity || opportunity} onClose={() => (useActivityUi.setState({ form: null, list: null }), useOpportunityUi.getState().close())}>
        <ActivityFormHost />
      </Opened>
    </>
  );
}
