import type { ReactNode } from 'react';
import { AppShell } from '@/shared/shell/AppShell';
import { OnboardingGate } from '@/features/onboarding';

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <OnboardingGate>
      <AppShell>{children}</AppShell>
    </OnboardingGate>
  );
}
