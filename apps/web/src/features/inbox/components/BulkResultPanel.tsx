// Kết quả thao tác hàng loạt (TIP-025b §C.2–3): số thành công / không đổi / lỗi + danh sách lỗi theo hội thoại (mã an toàn — hội thoại
// ngoài scope không hiện tên). > 50 hội thoại: "đã nhận, đang chạy nền" (CHƯA xong) — kết quả báo qua chuông khi việc dữ liệu kết thúc.
'use client';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useBulkStyles } from '../styles/bulk.styles';
import type { BulkOutcome } from '../bulk-types';
import type { Conversation } from '../types';

export interface BulkResultPanelProps {
  outcome: BulkOutcome | null;
  titles: Map<string, Conversation['title']>;
  onClose: () => void;
}

const reason = (code: string | null) => (code ?? '').split(':')[0] || 'INTERNAL';

export function BulkResultPanel({ outcome, titles, onClose }: BulkResultPanelProps) {
  const t = useTranslations('inbox.bulk');
  const te = useTranslations('errors');
  const { styles } = useBulkStyles();
  if (!outcome) return null;
  const failed = outcome.items.filter((x) => x.status === 'failed');
  const skipped = outcome.items.filter((x) => x.status === 'skipped').length;
  return (
    <div className={styles.result} role="status" data-testid="inbox-bulk-result">
      <div className={styles.resultHead}>
        <span className={styles.count}>{outcome.jobId ? t('jobAccepted') : t('summary', { done: outcome.updated, skipped, failed: failed.length })}</span>
        <button type="button" className={styles.btn} onClick={onClose} aria-label={t('dismiss')} data-testid="inbox-bulk-result-close">
          <Icon name="ic-x" size={12} color={color.text3} />
        </button>
      </div>
      {failed.length ? (
        <ul className={styles.list} data-testid="inbox-bulk-failed">
          {failed.map((x) => (
            <li key={x.id} className={styles.fail}>
              {titles.get(x.id) ?? t('hidden')} — {te(reason(x.error) as never)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
