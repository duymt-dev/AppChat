// NavRail ≥ md — prototype L799–886 (không topbar; thông báo / Nâng cấp / avatar ở đáy rail).
'use client';
import type { MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon } from '@appchat/ui';
import { useAuthz } from '../authz/useCan';
import { activeRailKey, RAIL_ITEMS, type NavItem } from './nav-config';
import { NavItemButton } from './NavItemButton';
import { NavFlyout } from './NavFlyout';
import { RailFoot } from './RailFoot';
import { useShellStore } from './shell-store';
import { useNavBadges } from './useShellData';
import { useShellStyles } from './shell.styles';

export interface NavRailProps {
  onUpgrade: () => void;
}

export function NavRail({ onUpgrade }: NavRailProps) {
  const t = useTranslations('shell');
  const router = useRouter();
  const pathname = usePathname();
  const tc = useTranslations('common');
  const { styles, cx } = useShellStyles();
  const expanded = useShellStore((s) => s.railExpanded);
  const toggleRail = useShellStore((s) => s.toggleRail);
  const setFlyout = useShellStore((s) => s.setFlyout);
  const setPopover = useShellStore((s) => s.setPopover);
  const { data: authz } = useAuthz();
  const { data: badges } = useNavBadges();
  const active = activeRailKey(pathname);

  const visible = (i: NavItem) =>
    !i.permission || !authz || authz.is_owner || authz.permissions.includes(i.permission);

  const enter = (item: NavItem) => (e: MouseEvent<HTMLDivElement>) => {
    if (!item.flyout) return;
    const r = e.currentTarget.getBoundingClientRect();
    setPopover(null);
    setFlyout({ kind: item.flyout, top: r.top, left: r.right + 8 });
  };

  return (
    <nav className={cx(styles.rail, expanded ? styles.railExp : styles.railCol)} data-testid="nav-rail">
      {expanded ? (
        <div className={styles.brandRow}>
          <div className={styles.logo}>
            <img src="/brand/appchat-symbol.png" alt={tc('appName')} />
          </div>
          <span className={styles.brandText}>{tc('appName')}</span>
          <button type="button" title={t('collapse')} className={cx(styles.railToggle, styles.railToggleExp)} onClick={toggleRail}>
            <Icon name="ic-menu" size={16} strokeWidth={1.9} />
          </button>
        </div>
      ) : (
        <div className={styles.brandCol}>
          <div className={styles.logo}>
            <img src="/brand/appchat-symbol.png" alt={tc('appName')} />
          </div>
          <button type="button" title={t('expand')} data-testid="rail-toggle" className={cx(styles.railToggle, styles.railToggleCol)} onClick={toggleRail}>
            <Icon name="ic-menu" size={17} strokeWidth={1.9} />
          </button>
        </div>
      )}
      <div className={cx(styles.railScroll, expanded ? styles.railScrollExp : styles.railScrollCol)}>
        {RAIL_ITEMS.filter(visible).map((item) => (
          <div
            key={item.key}
            data-flyout={item.flyout}
            className={cx(styles.navSlot, !expanded && styles.navSlotCol)}
            onMouseEnter={enter(item)}
            onMouseLeave={() => item.flyout && setFlyout(null)}
          >
            <NavItemButton
              item={item}
              active={active === item.key}
              expanded={expanded}
              badge={item.badge ? badges?.[item.badge] : undefined}
              onClick={() => router.push(item.route)}
            />
            {item.flyout ? <NavFlyout kind={item.flyout} /> : null}
          </div>
        ))}
      </div>
      <RailFoot expanded={expanded} onUpgrade={onUpgrade} />
    </nav>
  );
}
