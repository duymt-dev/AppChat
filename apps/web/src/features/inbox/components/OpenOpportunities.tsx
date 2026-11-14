// Khối "Cơ hội đang mở" của tab CRM Hồ sơ 360° (TIP-026c §4.2) — prototype L2480: chấm màu giai đoạn, tên, "Giai đoạn: … · xác suất …",
// giá trị rút gọn (ẩn theo quyền → nhãn ẩn, không 0). Đọc `opportunities` của 360° (chưa đóng); bấm mở drawer Cơ hội 360°.
'use client';
import { useTranslations } from 'next-intl';
import { OPPORTUNITY_PROBABILITY, isOpportunityClosed, type OpportunityItemDto } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { stageColor, useOpportunityUi } from '@/shared/opportunities';
import { usePanelStyles } from '../styles/panel.styles';
import { useCardStyles } from '../styles/card360.styles';

export function OpenOpportunities({ items }: { items: OpportunityItemDto[] }) {
  const t = useTranslations('inbox.p360');
  const to = useTranslations('common.opportunity');
  const fmt = useFmt();
  const { styles } = usePanelStyles();
  const { styles: cs } = useCardStyles();
  const open = useOpportunityUi((s) => s.open);
  const rows = items.filter((o) => !isOpportunityClosed(o.stage));
  return (
    <div className={styles.card} data-testid="p360-open-opps">
      <div className={styles.eyebrow}>{t('openDeal')}</div>
      {rows.length ? (
        rows.map((o) => (
          <button key={o.id} type="button" className={cs.oppRow} onClick={() => open(o.id)} data-testid={`p360-opp-${o.id}`}>
            <span className={cs.oppDot} style={{ background: stageColor(o.stage) }} />
            <span className={styles.grow}>
              <b>{o.title}</b>
              <span className={cs.oppMeta}>{to('stageProb', { stage: to(`stage.${o.stage}`), prob: OPPORTUNITY_PROBABILITY[o.stage] })}</span>
            </span>
            <b className={styles.ok}>{o.amount_hidden ? to('hidden') : o.amount_vnd ? fmt.moneyShort(o.amount_vnd) : to('none')}</b>
          </button>
        ))
      ) : (
        <div className={styles.small}>{to('noOpen')}</div>
      )}
    </div>
  );
}
