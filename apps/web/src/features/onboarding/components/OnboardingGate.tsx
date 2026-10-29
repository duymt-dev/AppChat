// Cổng phiên trên (app): chưa đăng nhập → /login; chưa khai báo → popup khai báo (chặn);
// đang khởi tạo → ProvisioningCard; xong → chào mừng trial (một lần); trial hết → thông báo (đóng được).
// Thứ tự ưu tiên như prototype L9555–9560.
'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi, authKeys, sessionQuery } from '@/features/auth';
import { DeclareBusinessModal } from './DeclareBusinessModal';
import { ProvisioningCard } from './ProvisioningCard';
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

  const ack = async (notice: 'trial_welcome' | 'trial_expired', then?: string) => {
    await authApi.ackNotice(notice);
    await qc.invalidateQueries({ queryKey: authKeys.session });
    if (then) router.push(then);
  };

  if (!s || !s.authed) return null;
  let overlay: ReactNode = null;
  if (!s.declared) overlay = <DeclareBusinessModal />;
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
