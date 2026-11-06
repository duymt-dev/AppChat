// AppShell (Blueprint §7.1): NavRail | main | AssistantDock + ConfirmActionHost + BillingNoticeHost (TIP-039); < md: MobileTabBar.
'use client';
import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmActionHost } from '../actions/ConfirmActionHost';
import { AssistantDock } from '../assistant/AssistantDock';
import { BillingNoticeHost } from '../billing/BillingNoticeHost';
import { useEventInvalidation } from '../realtime/event-invalidation';
import { NavRail } from './NavRail';
import { MobileTabBar } from './MobileTabBar';
import { RouteGuard } from './RouteGuard';
import { useShellStore } from './shell-store';
import { useShellStyles } from './shell.styles';

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const { styles } = useShellStyles();
  const setDock = useShellStore((s) => s.setDock);
  const setPopover = useShellStore((s) => s.setPopover);
  const popover = useShellStore((s) => s.popover);
  useEventInvalidation();

  // Ctrl/⌘+K mở Trợ lý (Blueprint §7.1)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setDock(true);
      }
      if (e.key === 'Escape') setPopover(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setDock, setPopover]);

  return (
    <div className={styles.shell} data-testid="app-shell">
      <NavRail onUpgrade={() => router.push('/settings/billing?upgrade=1')} />
      <main className={styles.main} onClick={() => popover && setPopover(null)}>
        <div className={styles.scroll}>
          <RouteGuard>{children}</RouteGuard>
        </div>
      </main>
      <MobileTabBar />
      <AssistantDock />
      <ConfirmActionHost />
      <BillingNoticeHost />
    </div>
  );
}
