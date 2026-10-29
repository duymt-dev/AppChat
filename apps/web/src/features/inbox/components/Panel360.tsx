// Hồ sơ 360° của khách — prototype L2011–2224: header · 5 tab · nội dung · hàng nghiệp vụ (báo giá / hợp đồng / đơn) · thanh hành động.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { useInboxUi } from '../inbox-store';
import { Profile360Actions } from './Profile360Actions';
import { Profile360Content, TABS_360 as TABS } from './Profile360Content';

export function Panel360({ contactId }: { contactId: string }) {
  const t = useTranslations('inbox.p360');
  const { styles, cx } = usePanelStyles();
  const ui = useInboxUi();

  return (
    <aside className={styles.panel} data-testid="panel-360">
      <div className={styles.head}>
        <span className={styles.headIcon}>
          <Icon name="ic-spark" size={14} color={color.white} />
        </span>
        {t('title')}
        <span className={styles.badge}>{t('aiBadge')}</span>
        <button type="button" className={styles.close} onClick={ui.toggle360} aria-label={t('close')}>
          <Icon name="ic-x" size={18} color={color.text3} />
        </button>
      </div>
      <div className={styles.tabs} role="tablist">
        {TABS.map((k) => (
          <button key={k} type="button" role="tab" aria-selected={ui.tab360 === k} className={cx(styles.tab, ui.tab360 === k && styles.tabOn)} onClick={() => ui.set({ tab360: k })}>
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>
      <div className={styles.scroll}>
        <Profile360Content contactId={contactId} tab={ui.tab360} />
      </div>
      <Profile360Actions contactId={contactId} />
    </aside>
  );
}
