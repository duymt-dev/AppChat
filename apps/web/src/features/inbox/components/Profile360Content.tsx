// Nội dung 5 tab + hàng thao tác của Hồ sơ 360° (prototype L2025–2224) — dùng chung cho panel hộp thư và drawer Khách hàng (qua index.ts).
'use client';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName } from '@appchat/ui';
import { usePanelStyles } from '../styles/panel.styles';
import { contactQuery } from '../api';
import { Overview360 } from './Overview360';
import { Ai360, Crm360, Files360, History360 } from './Tabs360';
import type { Tab360 } from '../inbox-store';

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

export const TABS_360: Tab360[] = ['overview', 'crm', 'ai', 'files', 'history'];

export function Profile360Content({ contactId, tab }: { contactId: string; tab: Tab360 }) {
  const c = useQuery(contactQuery(contactId)).data;
  if (!c) return null;
  return (
    <>
      {tab === 'overview' ? <Overview360 c={c} /> : null}
      {tab === 'crm' ? <Crm360 c={c} /> : null}
      {tab === 'ai' ? <Ai360 c={c} /> : null}
      {tab === 'files' ? <Files360 c={c} /> : null}
      {tab === 'history' ? <History360 c={c} /> : null}
    </>
  );
}

/** Hàng nghiệp vụ (báo giá / hợp đồng / đơn) + thanh hành động (email / ticket / đặt lịch) — prototype L2209–2222. */
export function Profile360Actions() {
  const t = useTranslations('inbox.p360');
  const router = useRouter();
  const { styles } = usePanelStyles();
  return (
    <>
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
    </>
  );
}
