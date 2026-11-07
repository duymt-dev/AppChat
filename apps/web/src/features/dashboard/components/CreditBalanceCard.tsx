// Ví Credit trên Tổng quan (TIP-038 pha 2): chỉ người quản lý ví nhận payload (API trả `credit: null` cho người khác — thẻ không hiện).
'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { color } from '@appchat/ui';
import { SectionCard } from './SectionCard';
import { useWorkStyles } from './work.styles';
import { useFmt } from '@/shared/i18n/useFmt';
import type { CreditInfo } from '../types';

export function CreditBalanceCard({ credit }: { credit: CreditInfo }) {
  const t = useTranslations('dashboard.credit');
  const router = useRouter();
  const { styles, cx } = useWorkStyles();
  const fmt = useFmt();
  return (
    <SectionCard index={7} accent={color.violet} title={t('title')} sub={t('sub')} testId="dash-credit">
      <div className={styles.metrics}>
        <div>
          <div className={styles.metricLabel}>{t('balance')}</div>
          <div className={cx(styles.metricValue, credit.low && styles.low)}>{fmt.number(credit.balance)}</div>
        </div>
        <div>
          <div className={styles.metricLabel}>{t('days')}</div>
          <div className={styles.metricValue}>{credit.days_estimate ? credit.days_estimate : '—'}</div>
        </div>
      </div>
      <button type="button" className={styles.btn} onClick={() => router.push('/settings/wallet')}>
        {t('open')}
      </button>
    </SectionCard>
  );
}
