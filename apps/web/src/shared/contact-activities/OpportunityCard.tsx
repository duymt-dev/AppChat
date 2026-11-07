// Thẻ "Cơ hội / Deal" (TIP-026b §3.3) — prototype L2401–2411: cơ hội hiện hành THẬT (không có → rỗng thật, không mẫu). Giá trị kỳ vọng
// ẩn với người không có quote.view → "Ẩn theo quyền" (không 0). "+ Thêm" / "Cập nhật deal" chỉ khi sửa được khách.
'use client';
import { useTranslations } from 'next-intl';
import type { ActivitySummaryDto } from '@appchat/shared';
import { useFmt } from '../i18n/useFmt';
import { useActivityUi } from './activity-store';
import { useActivityStyles } from './activity.styles';

export function OpportunityCard({ contactId, a }: { contactId: string; a: ActivitySummaryDto }) {
  const t = useTranslations('common.activities');
  const fmt = useFmt();
  const { styles } = useActivityStyles();
  const open = useActivityUi((s) => s.openForm);
  const list = useActivityUi((s) => s.openList);
  const o = a.opportunity.current;
  return (
    <div className={styles.card} data-testid="p360-opportunity">
      <div className={styles.head}>
        <span className={styles.eyebrow}>{t('deal')}</span>
        {a.can_edit ? (
          <button type="button" className={styles.link} onClick={() => open({ kind: 'opportunity', contactId })} data-testid="opp-add">
            {t('add')}
          </button>
        ) : null}
      </div>
      {o ? (
        <>
          <div className={styles.title}>{o.title}</div>
          <div className={styles.kv}>
            {t('dealValue')}
            <b data-testid="opp-amount">{o.amount_hidden ? t('amountHidden') : o.amount_vnd ? fmt.money(o.amount_vnd) : t('none')}</b>
          </div>
          <div className={styles.kv}>
            {t('dealStage')}
            <span className={styles.stage}>{t(`stage.${o.stage}`)}</span>
          </div>
          <div className={styles.kv}>
            {t('dealProb')}
            <b>{o.probability === null ? t('none') : `${o.probability}%`}</b>
          </div>
          <div className={styles.kv}>
            {t('dealClose')}
            <b>{o.expected_close_date ? fmt.date(`${o.expected_close_date}T00:00:00`) : t('none')}</b>
          </div>
          {o.need ? (
            <>
              <div className={styles.needLabel}>{t('need')}</div>
              <div className={styles.need}>{o.need}</div>
            </>
          ) : null}
          {a.can_edit ? (
            <button type="button" className={styles.outline} onClick={() => open({ kind: 'opportunity', contactId, editId: o.id })} data-testid="opp-edit">
              {t('updateDeal')}
            </button>
          ) : null}
          {a.opportunity.count > 1 ? (
            <button type="button" className={styles.more} onClick={() => list(contactId, 'opportunities')}>
              {t('allDeals', { n: a.opportunity.count })}
            </button>
          ) : null}
        </>
      ) : (
        <div className={styles.empty}>{t('dealEmpty')}</div>
      )}
    </div>
  );
}
