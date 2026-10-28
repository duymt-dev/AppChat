// Hồ sơ 360° của khách — prototype L2011–2224: header · 5 tab · nội dung · hàng nghiệp vụ (báo giá / hợp đồng / đơn) · thanh hành động.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { useInboxUi, type Tab360 } from '../inbox-store';
import { contactQuery } from '../api';
import { Overview360 } from './Overview360';
import { Ai360, Crm360, Files360, History360 } from './Tabs360';

const TABS: Tab360[] = ['overview', 'crm', 'ai', 'files', 'history'];
const OPS: [key: string, icon: IconName, tone: string, route: string][] = [
  ['quote', 'ic-doc', color.opsQuote, '/quotes'],
  ['contract', 'ic-doc', color.opsContract, '/contracts'],
  ['order', 'ic-cart', color.opsOrder, '/orders'],
];
const FOOT: [key: string, icon: IconName, bg: string, fg: string, route: string][] = [
  ['email', 'ic-mail', color.mailBg, color.mailText, '/inbox'],
  ['ticket', 'ic-ticket', color.ticketBg, color.amberGold, '/tickets'],
  ['booking', 'ic-cal', color.calBg, color.calText, '/calendar'],
];

export function Panel360({ contactId }: { contactId: string }) {
  const t = useTranslations('inbox.p360');
  const router = useRouter();
  const { styles, cx } = usePanelStyles();
  const ui = useInboxUi();
  const q = useQuery(contactQuery(contactId));
  const c = q.data;

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
        {c ? (
          <>
            {ui.tab360 === 'overview' ? <Overview360 c={c} /> : null}
            {ui.tab360 === 'crm' ? <Crm360 c={c} /> : null}
            {ui.tab360 === 'ai' ? <Ai360 c={c} /> : null}
            {ui.tab360 === 'files' ? <Files360 c={c} /> : null}
            {ui.tab360 === 'history' ? <History360 c={c} /> : null}
          </>
        ) : null}
      </div>
      <div className={styles.ops}>
        {OPS.map(([key, icon, tone, route]) => (
          <button key={key} type="button" className={styles.op} style={{ color: tone }} onClick={() => router.push(route)}>
            <Icon name={icon} size={14} color={tone} />
            {t(`ops.${key}` as never)}
          </button>
        ))}
      </div>
      <div className={styles.foot}>
        {FOOT.map(([key, icon, bg, fg, route]) => (
          <button key={key} type="button" className={styles.footBtn} style={{ background: bg, color: fg }} onClick={() => router.push(route)}>
            <Icon name={icon} size={15} color={fg} />
            {t(`foot.${key}` as never)}
          </button>
        ))}
      </div>
    </aside>
  );
}
