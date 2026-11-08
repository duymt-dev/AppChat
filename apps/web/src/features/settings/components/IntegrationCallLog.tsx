// Nhật ký lệnh gọi ra ngoài của kết nối (TIP-012b P3 §5.1): thao tác, trạng thái, mã lý do đã làm sạch, độ trễ, thời điểm — phân trang
// cursor ("Xem thêm"). Không thân request / dữ liệu khách.
'use client';
import { useTranslations } from 'next-intl';
import { useFmt } from '@/shared/i18n/useFmt';
import { useSectionStyles } from '../styles/section.styles';
import { useIntegDetailStyles } from '../styles/integration-detail.styles';
import type { CallReceipt } from '../integration-types';

const TONE: Record<CallReceipt['status'], 'ok' | 'warn' | 'bad' | 'idle'> = { succeeded: 'ok', queued: 'warn', running: 'warn', failed: 'bad', unknown: 'bad', cancelled: 'idle' };

export function IntegrationCallLog({ calls, more, onMore, loading }: { calls: CallReceipt[]; more: boolean; onMore: () => void; loading: boolean }) {
  const t = useTranslations('settings.integrations.detail');
  const fmt = useFmt();
  const { styles, cx } = useIntegDetailStyles();
  const s = useSectionStyles().styles;
  return (
    <div data-testid="st-int-log">
      <div className={styles.h}>{t('log')}</div>
      {calls.length === 0 ? <div className={styles.meta}>{t('logEmpty')}</div> : null}
      {calls.map((c) => (
        <div key={c.id} className={styles.row} data-testid="st-int-call" data-status={c.status}>
          <span className={styles.op}>
            {t(`op.${c.op.replaceAll('.', '__')}`)}
            {c.reason ? <span className={styles.meta}> · {t(`reason.${c.reason}`)}</span> : null}
          </span>
          <span className={cx(styles.pill, styles[TONE[c.status]])}>{t(`call.${c.status}`)}</span>
          <span className={styles.meta}>
            {c.latency_ms !== null ? `${fmt.number(c.latency_ms)} ms · ` : ''}
            {fmt.time(c.created_at)}
          </span>
        </div>
      ))}
      {more ? (
        <button type="button" className={cx(s.ghost, styles.more)} onClick={onMore} disabled={loading} data-testid="st-int-log-more">
          {t('logMore')}
        </button>
      ) : null}
    </div>
  );
}
