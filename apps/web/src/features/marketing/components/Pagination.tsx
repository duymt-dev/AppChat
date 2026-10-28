// Chân danh sách chiến dịch — prototype L3520–3533 (hiển thị 1 - n · trang · n / trang). Mock trả trọn danh sách nên chỉ có 1 trang.
'use client';
import { useTranslations } from 'next-intl';
import { useMarketingStyles } from '../styles/marketing.styles';

const PER = [10, 20, 50];
const PREV = '‹';
const NEXT = '›';

export function Pagination({ n }: { n: number }) {
  const t = useTranslations('marketing');
  const { styles, cx } = useMarketingStyles();
  return (
    <div className={styles.foot} data-testid="mk-foot">
      <span>{t.rich('foot', { n, b: (c) => <b>{c}</b> })}</span>
      <span className={styles.grow} />
      <div className={styles.pages}>
        <span className={cx(styles.page, styles.pageNav)}>{PREV}</span>
        <span className={cx(styles.page, styles.pageOn)}>1</span>
        <span className={cx(styles.page, styles.pageNav)}>{NEXT}</span>
      </div>
      <select className={styles.per} aria-label={t('perPage', { n: PER[0]! })}>
        {PER.map((p) => (
          <option key={p}>{t('perPage', { n: p })}</option>
        ))}
      </select>
    </div>
  );
}
