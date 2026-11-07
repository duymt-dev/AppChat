import type { ReactNode } from 'react';
import { AppShell } from '@/shared/shell/AppShell';
import { OnboardingGate } from '@/features/onboarding';
import { CrmFormsHost } from './_crm-forms/CrmFormsHost';
import { TransferHost } from './_data-transfer/TransferHost';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <AppShell>{children}</AppShell>
      <CrmFormsHost />
      <TransferHost />
    </OnboardingGate>
  );
}
