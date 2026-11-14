// Ngưỡng duyệt báo giá đang áp (TIP-032b P1, COMMERCE §3 Q5): đọc `GET /settings/sales-policy` (Owner chỉnh ở Cài đặt → Chính sách bán
// hàng) để form tính lý do cần duyệt và nhãn "tổng > …" / "giảm > …%" theo cấu hình, không hằng số. Chưa tải xong → mặc định 20M / 5%
// (server luôn kiểm lại khi gửi).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DEFAULT_APPROVAL_POLICY, type ApprovalPolicy } from '@appchat/shared';
import { salesPolicyQuery } from '@/features/settings/api';
import { useFmt } from '@/shared/i18n/useFmt';

export type ApprovalReason = 'total' | 'discount' | 'off_catalog';

export function useApprovalPolicy() {
  const t = useTranslations('quotes.form.reasons');
  const fmt = useFmt();
  const q = useQuery({ ...salesPolicyQuery(), staleTime: 60_000 });
  const policy: ApprovalPolicy = q.data ? { total_vnd: q.data.approval_total_vnd, discount_pct: q.data.approval_discount_pct } : DEFAULT_APPROVAL_POLICY;
  const label = (r: ApprovalReason) => t(r, { total: fmt.money(policy.total_vnd), pct: policy.discount_pct });
  return { policy, label };
}
