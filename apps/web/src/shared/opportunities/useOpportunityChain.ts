// Nút tạo nối tiếp của chuỗi chứng từ (TIP-026c §5.1) — đều qua action / form có sẵn, không đường ghi mới: báo giá mở form Báo giá điền
// sẵn khách + `opportunity_id` (ra nháp; không điền dòng hàng vì cơ hội không có đơn giá — cấm bịa giá); "Khách chốt" = quote.mark_accepted
// (COMMERCE §3 — không phải "Khách duyệt"); hợp đồng / đơn từ báo giá đã chốt; đề nghị thanh toán TT- mở form ở màn Đề nghị thanh toán
// từ đơn (`/invoices?order=`); thu tiền: màn Đề nghị thanh toán (032e đổi đích sang Tài chính).
'use client';
import { useRouter } from 'next/navigation';
import { useAction } from '../actions/useAction';
import { dispatchUiCommand } from '../assistant/ui-command-bus';
import { useOpportunityUi } from './opportunity-store';
import type { OpportunityDetailDto } from './types';

export function useOpportunityChain(o: OpportunityDetailDto) {
  const router = useRouter();
  const close = useOpportunityUi((s) => s.close);
  const accept = useAction('quote.mark_accepted');
  const toContract = useAction('contract.create_from_quote');
  const toOrder = useAction('order.create_from_quote');
  const go = (route: string) => {
    close();
    router.push(route);
  };
  return {
    pending: accept.isPending || toContract.isPending || toOrder.isPending,
    newQuote: () => {
      close();
      dispatchUiCommand({ type: 'prefill', form: 'quote.form', values: { contact_id: o.contact_id, opportunity_id: o.id, note: o.title } });
    },
    accept: (quoteId: string) => accept.run({ quote_id: quoteId }),
    toContract: (quoteId: string) => toContract.run({ quote_id: quoteId }),
    toOrder: (quoteId: string) => toOrder.run({ quote_id: quoteId }),
    newInvoice: (orderId: string) => go(`/invoices?order=${encodeURIComponent(orderId)}`),
    finance: () => go('/invoices'),
  };
}
