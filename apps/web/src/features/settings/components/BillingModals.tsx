// Gắn các hộp thanh toán (Nâng cấp, Nạp credit, QR hoá đơn, Liên hệ gói Doanh nghiệp) cho Gói & thanh toán và Ví — một chỗ đọc ngày dùng thử + gói hiện tại.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useMe } from '@/shared/shell/useShellData';
import { billingSummaryQuery } from '../api';
import { CheckoutModal } from './CheckoutModal';
import { ContactSalesModal } from './ContactSalesModal';
import { CreditModal } from './CreditModal';
import { UpgradeModal } from './UpgradeModal';

export function BillingModals() {
  const me = useMe().data;
  const s = useQuery(billingSummaryQuery());
  return (
    <>
      <UpgradeModal trialDays={me?.billing.trial_days_left ?? 0} current={s.data?.plan_key} />
      <CreditModal />
      <CheckoutModal />
      <ContactSalesModal />
    </>
  );
}
