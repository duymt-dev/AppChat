// Popup ví toàn app (TIP-039 pha 2, AC06): nghe realtime `billing.notice` (http: Socket.IO `/ws`; mock: sự kiện mock) + lỗi 402
// CREDIT_EXHAUSTED do useAction đẩy vào store. Người có `billing.manage` thấy nút Nạp Credit (mở Ví); người khác chỉ thấy nhắc liên hệ
// Chủ sở hữu (không mở hành động mua trái quyền). Trước khi hiện "hết" / "nhắc" đọc lại ví hiện tại của workspace — event trễ sau khi đã nạp
// (ví > 0) không bật popup hết Credit. Đổi workspace / đăng xuất → bỏ thông báo cũ.
'use client';
import { useEffect } from 'react';
import { Modal } from 'antd';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useQueryClient } from '@tanstack/react-query';
import { apiMode } from '../api/transport';
import { onMockEvent } from '../api/mock/store';
import { onSessionChange, sessionAuth } from '../api/http-transport';
import { transport } from '../api/client';
import { useCan } from '../authz/useCan';
import { subscribeRealtime } from '../realtime/socket';
import { noticeFromEvent, useBillingNotices, type BillingNotice } from './billing-notices';

const workspaceNow = () => (apiMode() === 'mock' ? 'mock' : sessionAuth().workspace_id);

/** Số dư hiện tại (plan + topup) của workspace đang mở. */
async function balanceNow(): Promise<number | null> {
  try {
    const w = await transport.get<{ plan_balance: number; topup_balance: number }>('/billing/wallet');
    return w.plan_balance + w.topup_balance;
  } catch {
    return null;
  }
}

/** Kiểm lại số dư trước khi hiện: "hết" chỉ khi ví ≤ 0, "đã có lại" chỉ khi ví > 0; không đọc được → vẫn hiện (an toàn hơn im lặng). */
export async function pushChecked(n: BillingNotice): Promise<void> {
  if (n.kind !== 'low') {
    const b = await balanceNow();
    if (b !== null && (n.kind === 'exhausted' ? b > 0 : b <= 0)) return;
  }
  if (n.workspace !== workspaceNow()) return;
  useBillingNotices.getState().push(n);
}

export function BillingNoticeHost() {
  const t = useTranslations('shell.billingNotice');
  const router = useRouter();
  const qc = useQueryClient();
  const canBuy = useCan('billing.manage');
  const current = useBillingNotices((s) => s.current);
  const dismiss = useBillingNotices((s) => s.dismiss);

  useEffect(() => {
    const on = (event: string, data?: unknown) => {
      if (event === 'billing.changed') void qc.invalidateQueries({ queryKey: ['billing'] });
      if (event !== 'billing.notice') return;
      void qc.invalidateQueries({ queryKey: ['billing'] });
      const n = noticeFromEvent(data, workspaceNow());
      if (n) void pushChecked(n);
    };
    const off = apiMode() === 'mock' ? onMockEvent((event) => on(event)) : subscribeRealtime(on);
    const offSession =
      apiMode() === 'mock'
        ? () => undefined
        : onSessionChange(() => useBillingNotices.getState().reset(workspaceNow()));
    return () => {
      off();
      offSession?.();
    };
  }, [qc]);

  if (!current) return null;
  const title =
    current.kind === 'low' ? t('lowTitle', { level: current.level ?? 80 }) : t(`${current.kind}Title`);
  const body = t(`${current.kind}Body`);
  const buy = canBuy && current.kind !== 'restored';
  return (
    <Modal
      open
      title={title}
      onCancel={dismiss}
      cancelText={t('close')}
      okText={t('topup')}
      okButtonProps={
        { style: buy ? undefined : { display: 'none' }, 'data-testid': 'billing-notice-topup' } as never
      }
      onOk={() => {
        dismiss();
        router.push('/settings/wallet');
      }}
      destroyOnHidden
      data-testid="billing-notice"
    >
      <p data-testid={`billing-notice-${current.kind}`}>{body}</p>
      {!canBuy && current.kind !== 'restored' ? (
        <p data-testid="billing-notice-ask-owner">{t('askOwner')}</p>
      ) : null}
    </Modal>
  );
}
