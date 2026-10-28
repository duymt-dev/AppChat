// < md: 5 tab — Tổng quan · Hộp thư · Trợ lý · Khách hàng · Thêm (Blueprint §7.1). Không có trong prototype (loại M).
'use client';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Drawer } from 'antd';
import { createStyles } from 'antd-style';
import { Icon, color, font, layout, z } from '@appchat/ui';
import { activeRailKey, CRM_ITEMS, MOBILE_TABS, RAIL_ITEMS, type NavItem } from './nav-config';

const useStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    display: none;
    ${responsive.md} {
      display: flex;
    }
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    height: ${layout.mobileTabH}px;
    background: ${color.rail};
    z-index: ${z.tabbar};
    padding: 0 6px env(safe-area-inset-bottom);
    border-top: 1px solid ${color.railSep};
  `,
  tab: css`
    flex: 1;
    min-width: ${layout.touch}px;
    min-height: ${layout.touch}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    background: none;
    border: none;
    color: ${color.text4};
    font-family: inherit;
    font-size: ${font.size.railLabel}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
  `,
  on: css`
    color: ${color.white};
  `,
  more: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: ${layout.touch}px;
    padding: 0 8px;
    font-size: ${font.size.body}px;
    color: ${color.text};
    cursor: pointer;
  `,
}));

const BY_KEY = new Map<string, NavItem>([...RAIL_ITEMS, ...CRM_ITEMS].map((i) => [i.key, i]));

export function MobileTabBar() {
  const t = useTranslations('shell.nav');
  const router = useRouter();
  const pathname = usePathname();
  const { styles, cx } = useStyles();
  const [moreOpen, setMoreOpen] = useState(false);
  const active = activeRailKey(pathname);
  const rest = [...RAIL_ITEMS, ...CRM_ITEMS.slice(1)].filter((i) => !MOBILE_TABS.includes(i.key));

  return (
    <>
      <nav className={styles.bar} data-testid="mobile-tabbar">
        {MOBILE_TABS.map((k) => {
          const item = BY_KEY.get(k)!;
          return (
            <button key={k} type="button" className={cx(styles.tab, active === k && styles.on)} onClick={() => router.push(item.route)}>
              <Icon name={item.icon} size={layout.icon} />
              {t(k)}
            </button>
          );
        })}
        <button type="button" className={styles.tab} onClick={() => setMoreOpen(true)} data-testid="mobile-more">
          <Icon name="ic-menu" size={layout.icon} />
          {t('more')}
        </button>
      </nav>
      <Drawer open={moreOpen} placement="bottom" onClose={() => setMoreOpen(false)} title={t('more')} size="large">
        {rest.map((i) => (
          <div
            key={i.key}
            className={styles.more}
            onClick={() => {
              setMoreOpen(false);
              router.push(i.route);
            }}
          >
            <Icon name={i.icon} size={18} color={color.text3} />
            {t(i.key)}
          </div>
        ))}
      </Drawer>
    </>
  );
}
