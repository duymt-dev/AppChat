// Hàng 6 nút mở form tại chỗ của Hồ sơ 360° (REQ-F11, prototype L2562–2573 — cùng kích thước, nền trắng viền xám).
// Luật COMMERCE (D46, không đổi): báo giá Nháp → Cập nhật, đã gửi → Tạo phiên bản mới (quote.request_revision rồi sửa bản mới);
// trạng thái khác (chờ duyệt / đã duyệt chưa gửi / đã chốt / hết hạn…) không sửa được theo QUOTE_FLOW → tạo báo giá mới điền sẵn khách;
// hợp đồng Nháp → Cập nhật, đã gửi ký → mở chi tiết chỉ xem (ContractDrawer tại chỗ, không rời Hộp thư / Khách hàng);
// Đơn / Ticket / Lịch hẹn: luôn tạo mới. Gửi email: modal soạn email dùng chung (shared/crm-forms).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { QUOTE_FLOW, nextState } from '@appchat/shared';
import { Icon, color, type IconName } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useEmailComposeUi } from '@/shared/crm-forms/email-compose-store';
import { latestQuoteByContactQuery, useQuotesUi } from '@/features/quotes';
import { latestContractByContactQuery, useContractsUi } from '@/features/contracts';
import { useOrdersUi } from '@/features/orders';
import { useTicketsUi } from '@/features/tickets';
import { useCalendarUi } from '@/features/calendar';
import { usePanelStyles } from '../styles/panel.styles';
import { contactQuery } from '../api';

const OPS: [key: string, icon: IconName, tone: string][] = [
  ['quote', 'ic-doc', color.opsQuote],
  ['contract', 'ic-doc', color.opsContract],
  ['order', 'ic-cart', color.opsOrder],
];
const FOOT: [key: string, icon: IconName, tone: string][] = [
  ['email', 'ic-mail', color.mailText],
  ['ticket', 'ic-ticket', color.amberGold],
  ['booking', 'ic-cal', color.calText],
];

/** Hàng nghiệp vụ (báo giá / hợp đồng / đơn) + thanh hành động (email / ticket / đặt lịch) — prototype L2562–2573. */
export function Profile360Actions({ contactId }: { contactId: string }) {
  const t = useTranslations('inbox.p360');
  const { styles } = usePanelStyles();
  const contact = useQuery(contactQuery(contactId)).data;
  const quote = useQuery(latestQuoteByContactQuery(contactId)).data;
  const contract = useQuery(latestContractByContactQuery(contactId)).data;
  const requestRevision = useAction<{ quote_id: string }>('quote.request_revision');
  const openEmail = useEmailComposeUi((s) => s.open);

  const onQuote = async () => {
    const allows = (a: string) => !!quote && nextState(QUOTE_FLOW, quote.status, a) !== null;
    if (allows('quote.update')) return useQuotesUi.getState().set({ form: 'edit', editId: quote!.id });
    if (!quote || !allows('quote.request_revision')) return useQuotesUi.getState().set({ form: 'create', prefill: { contact_id: contactId } });
    const res = await requestRevision.run({ quote_id: quote.id });
    if (res) useQuotesUi.getState().set({ form: 'edit', editId: res.result.quote_id });
  };
  const onContract = () => {
    if (!contract) return useContractsUi.getState().set({ form: 'create', prefill: { contact_id: contactId } });
    if (contract.status === 'draft') return useContractsUi.getState().set({ form: 'edit', editId: contract.id });
    useContractsUi.getState().set({ detail: contract.id, tab: 'overview' });
  };
  const onOrder = () => useOrdersUi.getState().set({ form: 'create', prefill: { contact_id: contactId } });
  const onTicket = () => useTicketsUi.getState().set({ form: true, prefill: { contact_id: contactId } });
  const onBooking = () => useCalendarUi.getState().set({ form: 'create', prefill: { contact_id: contactId } });
  const onEmail = () => {
    if (!contact) return;
    openEmail({ contactId, to: contact.email ? `${contact.name} <${contact.email}>` : contact.name });
  };

  const HANDLERS: Record<string, () => void> = {
    quote: () => void onQuote(),
    contract: onContract,
    order: onOrder,
    email: onEmail,
    ticket: onTicket,
    booking: onBooking,
  };

  return (
    <>
      <div className={styles.ops}>
        {OPS.map(([key, icon, tone]) => (
          <button key={key} type="button" className={styles.op} style={{ color: tone }} onClick={HANDLERS[key]} data-testid={`p360-${key}`}>
            <Icon name={icon} size={14} color={tone} />
            {t(`ops.${key}` as never)}
          </button>
        ))}
      </div>
      <div className={styles.foot}>
        {FOOT.map(([key, icon, tone]) => (
          <button key={key} type="button" className={styles.footBtn} style={{ color: tone }} onClick={HANDLERS[key]} data-testid={`p360-${key}`}>
            <Icon name={icon} size={15} color={tone} />
            {t(`foot.${key}` as never)}
          </button>
        ))}
      </div>
    </>
  );
}
