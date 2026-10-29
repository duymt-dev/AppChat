import type { ReactNode } from 'react';
import { AppShell } from '@/shared/shell/AppShell';

export default function AppLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
