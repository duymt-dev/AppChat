import type { ReactNode } from 'react';
import { AppShell } from '@/shared/shell/AppShell';
import { OnboardingGate } from '@/features/onboarding';
import { CrmFormsHost } from './_crm-forms/CrmFormsHost';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <AppShell>{children}</AppShell>
      <CrmFormsHost />
    </OnboardingGate>
  );
}
