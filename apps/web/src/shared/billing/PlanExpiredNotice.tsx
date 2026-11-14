// Popup gói trả phí hết hạn (TIP-039 AC09, DC-367): summary `status: expired` → báo một lần mỗi kỳ hết hạn (khoá workspace + ngày hết hạn,
// nhớ trong phiên trình duyệt): AI / hạn mức gói tạm khoá, dữ liệu + Credit nạp thêm giữ nguyên, giữ dữ liệu tới `retain_until` (không xoá
// ở 039). Người có billing.manage có nút "Gia hạn" (mở Gói & thanh toán + popup Nâng cấp — gói chỉ kích hoạt lại khi tiền về); người khác
// chỉ thấy nhắc liên hệ Chủ sở hữu. Trial hết hạn có popup riêng (onboarding TrialExpired) — không trùng.
'use client';
import { useState } from 'react';
import { Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { transport } from '../api/client';
import { useCan } from '../authz/useCan';
import { useFmt } from '../i18n/useFmt';

interface Summary {
  plan_name: string;
  status: string;
  expires_at: string | null;
  retain_until?: string | null;
}

const SEEN = 'appchat.planExpiredSeen';
const seen = (k: string) => {
  try {
    return sessionStorage.getItem(SEEN) === k;
  } catch {
    return false;
  }
};
const remember = (k: string) => {
  try {
    sessionStorage.setItem(SEEN, k);
  } catch {
    // Không lưu được (chế độ riêng tư) → chỉ đóng trong lần render này.
  }
};

export function PlanExpiredNotice() {
  const t = useTranslations('shell.planExpired');
  const fmt = useFmt();
  const router = useRouter();
  const canBuy = useCan('billing.manage');
  const q = useQuery({ queryKey: ['billing', 'summary'], queryFn: () => transport.get<Summary>('/billing/summary'), staleTime: 60_000 });
  const [closed, setClosed] = useState<string | null>(null);
  const s = q.data;
  const key = s?.status === 'expired' ? `${s.plan_name}:${s.expires_at ?? ''}` : null;
  if (!s || !key || closed === key || seen(key)) return null;
  const close = () => {
    remember(key);
    setClosed(key);
  };
  return (
    <Modal
      open
      title={t('title', { plan: s.plan_name })}
      onCancel={close}
      cancelText={t('close')}
      okText={t('renew')}
      okButtonProps={{ style: canBuy ? undefined : { display: 'none' }, 'data-testid': 'plan-expired-renew' } as never}
      onOk={() => {
        close();
        router.push('/settings/billing?upgrade=1');
      }}
      destroyOnHidden
      data-testid="plan-expired"
    >
      <p>{t('body', { at: s.expires_at ? fmt.date(s.expires_at) : '—' })}</p>
      {s.retain_until ? <p data-testid="plan-expired-retain">{t('retain', { at: fmt.date(s.retain_until) })}</p> : null}
      {!canBuy ? <p data-testid="plan-expired-ask-owner">{t('askOwner')}</p> : null}
    </Modal>
  );
}
