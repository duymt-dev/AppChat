// "Lịch sử cơ hội đã thêm" (TIP-026c §5.1) — prototype L2407–2416: chấm màu trạng thái, tên + giá trị rút gọn, dòng meta, chip trạng thái.
// Dữ liệu thật (PD-901): meta = nguồn + ngày đóng / lý do Thua của chính cơ hội (không dựng "thêm từ chat Zalo OA"). Bấm mở drawer.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '../i18n/useFmt';
import { useOpportunityStyles } from './opportunity.styles';
import { STATUS_DOT, STATUS_TONE, statusOf, type OpportunityItemDto } from './types';

export function OpportunityHistory({ items, total, onOpen, onAll }: { items: OpportunityItemDto[]; total: number; onOpen: (id: string) => void; onAll: () => void }) {
  const t = useTranslations('common.opportunity');
  const fmt = useFmt();
  const { styles } = useOpportunityStyles();
  const meta = (o: OpportunityItemDto) => {
    const parts = [t(`source.${o.source_kind}`)];
    if (o.closed_at) parts.push(t(o.stage === 'won' ? 'wonAt' : 'lostAt', { date: fmt.date(o.closed_at) }));
    if (o.lost_reason) parts.push(t(`lostReason.${o.lost_reason}`));
    return parts.join(' · ');
  };
  return (
    <div className={styles.hist} data-testid="opp-history">
      <div className={styles.label}>{t('history', { n: total })}</div>
      {items.map((o) => {
        const st = statusOf(o.stage);
        const dot = STATUS_DOT[st];
        return (
          <button key={o.id} type="button" className={styles.histItem} onClick={() => onOpen(o.id)} data-testid={`opp-hist-${o.id}`}>
            <span className={styles.dot} style={{ background: dot, boxShadow: `0 0 0 3px ${dot}26` }} />
            <div className={styles.histBody}>
              <div className={styles.histTop}>
                <span>{o.title}</span>
                <b>{o.amount_hidden ? t('hidden') : o.amount_vnd ? fmt.moneyShort(o.amount_vnd) : t('none')}</b>
              </div>
              <div className={styles.meta}>{meta(o)}</div>
              <span className={styles.status} style={STATUS_TONE[st]}>
                {st === 'open' ? t(`stage.${o.stage}`) : t(`status.${st}`)}
              </span>
            </div>
          </button>
        );
      })}
      {total > items.length ? (
        <button type="button" className={styles.link} onClick={onAll} data-testid="opp-all">
          {t('all', { n: total })}
        </button>
      ) : null}
    </div>
  );
}
