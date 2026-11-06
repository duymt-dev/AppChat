// Gắn các hộp thanh toán (Nâng cấp, Nạp credit, QR hoá đơn, Liên hệ gói Doanh nghiệp) cho Gói & thanh toán và Ví — một chỗ đọc ngày dùng thử + gói hiện tại.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useMe } from '@/shared/shell/useShellData';
import { billingPlansQuery, billingSummaryQuery } from '../api';
import { CheckoutModal } from './CheckoutModal';
import { ContactSalesModal } from './ContactSalesModal';
import { CreditModal } from './CreditModal';
import { PlanChangeModal } from './PlanChangeModal';
import { UpgradeModal } from './UpgradeModal';

export function BillingModals() {
  const me = useMe().data;
  const s = useQuery(billingSummaryQuery());
  const plans = useQuery(billingPlansQuery()).data?.plans;
  const planName = (key: string) => [...(plans?.personal ?? []), ...(plans?.business ?? [])].find((p) => p.key === key)?.name ?? key;
  return (
    <>
      <UpgradeModal trialDays={me?.billing.trial_days_left ?? 0} current={s.data?.plan_key} />
      <CreditModal />
      <CheckoutModal />
      <ContactSalesModal />
      <PlanChangeModal planName={planName} />
    </>
  );
}
