// Cổng phiên trên (app): chưa đăng nhập → /login; chưa khai báo → popup khai báo (chặn);
// đang khởi tạo → ProvisioningCard; xong → chào mừng trial (một lần); trial hết → thông báo (đóng được).
// Thứ tự ưu tiên như prototype L9555–9560. TIP-041: workspace đã lưu trữ / đang khôi phục → RestoringCard (mở workspace = yêu cầu khôi
// phục); mỗi lần vào app ghi `workspace.open` một lần (mốc hoạt động — không toast).
'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, authKeys, sessionQuery } from '@/features/auth';
import { useAction } from '@/shared/actions/useAction';
import { DeclareBusinessModal } from './DeclareBusinessModal';
import { ProvisioningCard } from './ProvisioningCard';
import { RestoringCard } from './RestoringCard';
import { TrialWelcome } from './TrialWelcome';
import { TrialExpired } from './TrialExpired';

const PRICING = '/settings/billing?upgrade=1';

export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: s } = useQuery(sessionQuery());
  useEffect(() => {
    if (s && !s.authed) router.replace('/login');
  }, [s, router]);
  const open = useAction('workspace.open');
  const opened = useRef<string | null>(null);
  const ws = s?.authed && s.declared ? (s.workspace_id ?? 'current') : null;
  useEffect(() => {
    if (!ws || (s?.provisioned === false && !s.lifecycle) || opened.current === ws) return;
    opened.current = ws;
    void open.run({}, { silent: true, onError: () => true });
  }, [ws, s?.provisioned, s?.lifecycle, open]);

  const ack = async (notice: 'trial_welcome' | 'trial_expired', then?: string) => {
    await authApi.ackNotice(notice);
    await qc.invalidateQueries({ queryKey: authKeys.session });
    if (then) router.push(then);
  };

  if (!s || !s.authed) return null;
  let overlay: ReactNode = null;
  if (!s.declared) overlay = <DeclareBusinessModal />;
  else if (s.lifecycle) overlay = <RestoringCard />;
  else if (!s.provisioned) overlay = <ProvisioningCard />;
  else if (!s.trialSeen && s.trialDaysLeft > 0)
    overlay = <TrialWelcome trialEndsAt={s.trialEndsAt} onStart={() => void ack('trial_welcome')} onPricing={() => void ack('trial_welcome', PRICING)} />;
  else if (s.trialDaysLeft <= 0 && !s.expiredSeen)
    overlay = <TrialExpired onClose={() => void ack('trial_expired')} onUpgrade={() => void ack('trial_expired', PRICING)} />;

  return (
    <>
      {children}
      {overlay}
    </>
  );
}
