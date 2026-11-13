'use client';
import { Icon, color, layout } from '@appchat/ui';
import { useTranslations } from 'next-intl';
import type { NavItem } from './nav-config';
import { useShellStyles } from './shell.styles';

export interface NavItemButtonProps {
  item: NavItem;
  active: boolean;
  expanded: boolean;
  badge?: number;
  onClick: () => void;
}

export function NavItemButton({ item, active, expanded, badge, onClick }: NavItemButtonProps) {
  const t = useTranslations('shell.nav');
  const { styles, cx } = useShellStyles();
  return (
    <button
      type="button"
      data-nav={item.key}
      className={cx(styles.navi, expanded ? styles.naviExpanded : styles.naviCollapsed, active && styles.naviActive)}
      onClick={onClick}
    >
      <Icon name={item.icon} size={layout.icon} color={active ? color.white : color.text4} />
      <span
        className={cx(
          expanded ? styles.labelExpanded : styles.label,
          active && styles.labelActive,
          active && expanded && styles.labelActiveExpanded,
        )}
      >
        {t(item.key)}
      </span>
      {badge ? (
        <span className={styles.badge} data-testid="nav-badge">
          {badge}
        </span>
      ) : null}
    </button>
  );
}
