// Kết quả chuyển phụ trách thật (TIP-015d §4.5): số khách đã chuyển / bỏ qua (đã là người phụ trách) / chờ duyệt / lỗi / đã dừng + số hội
// thoại / báo giá / lịch hẹn chuyển kèm (từ server). Chạy nhiều khách: từng khách lỗi giữ mã lỗi; "chờ duyệt" không tính là đã chuyển.
'use client';
import { useTranslations } from 'next-intl';
import { summarize, type TransferOutcome } from '../hooks/useContactTransfer';
import { useTransferResultStyles } from '../styles/transfer-result.styles';

export function TransferResult({ results, names }: { results: TransferOutcome[]; names?: Map<string, string> }) {
  const t = useTranslations('customers.transfer.result');
  const te = useTranslations('errors');
  const { styles, cx } = useTransferResultStyles();
  if (!results.length) return null;
  const s = summarize(results);
  const stats = [
    ['transferred', s.transferred],
    ['skipped', s.skipped],
    ['pending', s.pending],
    ['errors', s.errors],
    ['cancelled', s.cancelled],
  ] as const;
  const failed = results.filter((r): r is Extract<TransferOutcome, { kind: 'error' }> => r.kind === 'error');
  return (
    <div className={styles.box} data-testid="transfer-result" role="status">
      <div className={styles.stats}>
        {stats
          .filter(([, n]) => n > 0)
          .map(([k, n]) => (
            <span key={k} className={cx(styles.stat, styles[k])} data-stat={k}>
              <b>{n}</b> {t(k)}
            </span>
          ))}
      </div>
      {s.transferred > 0 && (
        <div className={styles.moved} data-testid="transfer-moved">
          {t('moved', { conversations: s.moved.conversations, quotes: s.moved.quotes, appointments: s.moved.appointments })}
        </div>
      )}
      {s.pending > 0 && <div className={styles.note}>{t('pendingHint')}</div>}
      {failed.length > 0 && (
        <ul className={styles.errList}>
          {failed.map((r) => (
            <li key={r.contactId} data-contact={r.contactId}>
              {names?.get(r.contactId) ?? r.contactId}: {te.has(r.code as never) ? te(r.code as never) : r.code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
