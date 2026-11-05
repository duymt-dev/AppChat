// Khối module khác của Hồ sơ 360° (TIP-015b REQ-F02c, DEF-026-1): báo giá / đơn gần đây, lịch hẹn sắp tới, ticket mở, SLA phản hồi, CSAT
// gần nhất — từ `insights.links` (server kiểm quyền module + scope). `null` → "không có quyền xem" (khác danh sách rỗng "chưa có dữ liệu").
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { usePanelStyles } from '../styles/panel.styles';
import type { Contact360 } from '../types';

type Links = NonNullable<Contact360['insights']>['links'];
export const LINK_BLOCKS = ['quotes', 'orders', 'appts', 'ticket', 'sla', 'csat'] as const;

export function LinkBlock({ k, links }: { k: (typeof LINK_BLOCKS)[number]; links: Links | undefined }) {
  const t = useTranslations('inbox.p360');
  const fmt = useFmt();
  const { styles } = usePanelStyles();
  const none = <div className={styles.small}>{t('blockNoData')}</div>;
  const denied = <div className={styles.small}>{t('blockDenied')}</div>;
  if (!links) return none;
  if (k === 'sla') return links.sla ? <div className={styles.kv}>{links.sla.code}<b>{t(links.sla.result === 'met' ? 'slaMet' : 'slaBreached')}</b></div> : none;
  if (k === 'csat') return links.csat ? <div className={styles.kv}>{links.csat.code}<b>{t('csatScore', { n: links.csat.score })}</b></div> : none;
  const rows = links[k === 'ticket' ? 'tickets' : k];
  if (rows === null) return denied;
  if (!rows.length) return none;
  return (
    <>
      {rows.map((r) => (
        <div key={r.id} className={styles.kv} data-link={r.code}>
          <span>
            <b>{r.code}</b> {r.title}
            <div className={styles.small}>{k === 'appts' ? `${fmt.date(r.at)} ${fmt.time(r.at)}` : fmt.date(r.at)}</div>
          </span>
          <span>{r.amount ? fmt.money(r.amount) : t(`linkStatus.${r.status}` as never)}</span>
        </div>
      ))}
    </>
  );
}
