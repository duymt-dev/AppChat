// SettingsShell (Blueprint §7.2) — prototype L5754–5776: topbar + nav nhóm 280px (lọc theo ô tìm) + panel chính (eyebrow + tiêu đề).
'use client';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { App } from 'antd';
import { Icon, color } from '@appchat/ui';
import { useShellStyles } from '../styles/shell.styles';
import { NAV, type SectionKey } from '../registry';
import { foldVi } from '../text';

const norm = foldVi;

interface Props {
  active: SectionKey;
  children: ReactNode;
  /** Nút phải của tiêu đề màn (ví dụ "Tạo vai trò"). */
  action?: ReactNode;
  sub?: string;
}

export function SettingsShell({ active, children, action, sub }: Props) {
  const t = useTranslations('settings');
  const { message } = App.useApp();
  const router = useRouter();
  const { styles, cx } = useShellStyles();
  const [q, setQ] = useState('');
  const k = norm(q.trim());
  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => !k || norm(t(`nav.${i.key}`)).includes(k)) })).filter((g) => g.items.length);
  return (
    <div className={styles.wrap} data-testid="settings">
      <div className={styles.top}>
        <div className={styles.title}>{t('title')}</div>
        <span className={styles.sub}>{t('sub')}</span>
        <span className={styles.grow} />
        <div className={styles.search}>
          <Icon name="ic-search" size={13} color={color.text4} strokeWidth={1.9} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('search')} aria-label={t('search')} data-testid="st-search" />
        </div>
        <button type="button" className={styles.chip} onClick={() => void message.info(t('docsSoon'))}>
          <Icon name="ic-help" size={14} color={color.text3} />
          {t('docs')}
        </button>
      </div>
      <div className={styles.body}>
        <nav className={styles.nav} data-testid="st-nav">
          {groups.map((g) => (
            <div key={g.key}>
              <div className={styles.group}>{t(`group.${g.key}`)}</div>
              {g.items.map((i) => {
                const on = i.key === active;
                return (
                  <button
                    key={i.key}
                    type="button"
                    className={cx(styles.item, on && styles.itemOn)}
                    onClick={() => router.push(`/settings/${i.key}`)}
                    data-testid={`st-nav-${i.key}`}
                    aria-current={on ? 'page' : undefined}
                  >
                    <Icon name={i.icon} size={15} color={on ? color.brand : color.text3} strokeWidth={1.8} />
                    <span className={styles.grow}>{t(`nav.${i.key}`)}</span>
                    {i.n ? <span className={styles.n}>{i.n}</span> : null}
                    {i.badge ? <span className={styles.badge}>{i.badge}</span> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={styles.main}>
          <div className={styles.pad}>
            <div className={styles.head}>
              <div className={styles.grow}>
                <div className={styles.eyebrow}>{t('title')}</div>
                <div className={styles.h1} data-testid="st-title">
                  {t(`head.${active}`)}
                </div>
                {sub ? <div className={styles.hSub}>{sub}</div> : null}
              </div>
              {action}
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
