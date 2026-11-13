// Kết quả sửa ticket hàng loạt (TIP-034c §3.5 / §4.1): trạng thái thao tác (đang chạy nền / xong / dừng), tổng đã đổi / đã đúng sẵn / chưa áp
// dụng, mã lỗi an toàn TỪNG id (không tiêu đề / người phụ trách của ticket ẩn), nút Hoàn tác (action chuẩn ticket.bulk_undo — xem trước +
// xác nhận) chỉ khi thao tác đã kết thúc và có ticket đã đổi; hoàn tác một phần báo đúng số xung đột, không giả "đã hoàn tác".
'use client';
import { useTranslations } from 'next-intl';
import { useBulkResultStyles } from '../styles/bulk-results.styles';
import {
  failedOutcomes,
  isTerminal,
  type BulkOp,
  type TicketBulkOutcome,
  type TicketBulkResult,
  type TicketBulkUndoResult,
} from '../bulk-types';

export interface TicketBulkResultsProps {
  op: BulkOp;
  result: TicketBulkResult | undefined;
  undoResult: TicketBulkUndoResult | undefined;
  codeOf: (id: string) => string;
  pending?: boolean;
  onUndo: () => void;
  onCancel: () => void;
  onRetry: () => void;
  onClose: () => void;
}

function Failures({ items, codeOf }: { items: TicketBulkOutcome[]; codeOf: (id: string) => string }) {
  const t = useTranslations('tickets.bulk.result');
  const { styles, cx } = useBulkResultStyles();
  if (!items.length) return null;
  return (
    <ul className={styles.list} data-testid="tk-bulk-failures">
      {items.map((o) => (
        <li key={o.id} className={styles.row} data-outcome={o.error?.code}>
          <span className={styles.code}>{codeOf(o.id)}</span>
          <span className={cx(o.error?.code !== 'CONFLICT' && styles.bad)}>
            {t.has(`code.${o.error?.code}` as never)
              ? t(`code.${o.error?.code}` as never)
              : t('code.INTERNAL')}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TicketBulkResults({
  op,
  result,
  undoResult,
  codeOf,
  pending,
  onUndo,
  onCancel,
  onRetry,
  onClose,
}: TicketBulkResultsProps) {
  const t = useTranslations('tickets.bulk.result');
  const { styles } = useBulkResultStyles();
  if (!result) return null;
  const done = isTerminal(result);
  const ok = result.outcomes.filter((o) => o.ok);
  const changed = ok.filter((o) => o.changed).length;
  const failed = failedOutcomes(result.outcomes);
  const op_ = result.operation;
  const undoing = !!op.undoJobId;
  const undoDone = isTerminal(undoResult);
  return (
    <section className={styles.box} data-testid="tk-bulk-results" data-status={op_.status} aria-live="polite">
      <div className={styles.head}>
        <span className={styles.title}>{t('title')}</span>
        {done ? <span className={styles.note}>{t(`status.${op_.status}` as never)}</span> : null}
        <span className={styles.grow} />
        {!done ? (
          <button
            type="button"
            className={styles.btn}
            onClick={onCancel}
            disabled={op_.status === 'cancelling'}
            data-testid="tk-bulk-cancel"
          >
            {t('cancel')}
          </button>
        ) : null}
        {done && !undoing && failed.some((o) => o.error?.code === 'INTERNAL') ? (
          <button type="button" className={styles.btn} onClick={onRetry} data-testid="tk-bulk-retry">
            {t('retry')}
          </button>
        ) : null}
        {done && !undoing && changed > 0 && op.logId ? (
          <button
            type="button"
            className={styles.btn}
            onClick={onUndo}
            disabled={pending}
            data-testid="tk-bulk-undo"
          >
            {t('undo')}
          </button>
        ) : null}
        {done && (!undoing || undoDone) ? (
          <button type="button" className={styles.btn} onClick={onClose} data-testid="tk-bulk-close">
            {t('close')}
          </button>
        ) : null}
      </div>
      {!done ? (
        <div className={styles.note} data-testid="tk-bulk-running">
          {t('running', { n: op_.pending, total: op_.total })}
        </div>
      ) : null}
      <div className={styles.note} data-testid="tk-bulk-summary">
        {t('summary', { changed, same: ok.length - changed, failed: failed.length })}
        {result.duplicates ? ` · ${t('duplicates', { n: result.duplicates })}` : ''}
      </div>
      {op.agent ? (
        <div className={styles.warn} data-testid="tk-bulk-agent-note">
          {t('agentNotRun')}
        </div>
      ) : null}
      {done && failed.length ? <div className={styles.note}>{t('keptSelected')}</div> : null}
      <Failures items={failed} codeOf={codeOf} />
      {undoing && undoResult ? (
        <>
          <div className={styles.note} data-testid="tk-bulk-undo-summary">
            {undoDone
              ? t('undoSummary', {
                  undone: undoResult.undone,
                  conflicts: undoResult.conflicts,
                  failed: undoResult.failed - undoResult.conflicts,
                })
              : t('undoRunning', { n: undoResult.operation.pending })}
          </div>
          <Failures items={failedOutcomes(undoResult.outcomes)} codeOf={codeOf} />
        </>
      ) : null}
    </section>
  );
}
