// Tóm tắt bàn giao có cấu trúc (TIP-022b C) — trong thẻ "Cần người" của luồng tin: khách cần gì, dữ kiện / bản ghi đã chạm (đã chiếu theo
// quyền người xem ở server — bản ghi không được thấy không có ở đây), hành động AI đã thử kèm KẾT QUẢ THẬT (chờ duyệt / bị chặn / lỗi ≠
// xong), điều chưa giải quyết. Tách khỏi lý do ngắn + nháp gửi khách. Đổi hội thoại / workspace → query khác key, không hiện tóm tắt cũ.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { handoffSummaryQuery } from '../api';

const useStyles = createStyles(({ css }) => ({
  box: css`
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px dashed ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    text-transform: uppercase;
  `,
  row: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  pill: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    background: ${color.violetBg};
    color: ${color.violetInk};
  `,
  bad: css`
    background: ${color.dangerBg};
    color: ${color.hotText};
  `,
  muted: css`
    color: ${color.text4};
  `,
}));

export function HandoffSummaryPanel({ conversationId }: { conversationId: string }) {
  const t = useTranslations('inbox.summary');
  const { styles, cx } = useStyles();
  const q = useQuery(handoffSummaryQuery(conversationId));
  if (q.isLoading)
    return (
      <div className={cx(styles.box, styles.muted)} data-testid="handoff-summary-loading">
        {t('loading')}
      </div>
    );
  if (q.isError)
    return (
      <div className={styles.box} data-testid="handoff-summary-error">
        <span className={styles.muted}>{t('error')}</span>
        <button
          type="button"
          className={styles.pill}
          onClick={() => void q.refetch()}
          data-testid="handoff-summary-retry"
        >
          {t('retry')}
        </button>
      </div>
    );
  const s = q.data;
  if (!s) return null;
  return (
    <div className={styles.box} data-testid="handoff-summary">
      <div className={styles.h}>{t('title')}</div>
      {s.request ? (
        <div data-testid="handoff-summary-request">{s.request}</div>
      ) : (
        <div className={styles.muted}>{t('unknown')}</div>
      )}
      {s.facts.length ? (
        <div className={styles.row} data-testid="handoff-summary-facts">
          {s.facts.map((f) => (
            <span key={`${f.label}-${f.value}`} className={styles.pill} data-ref={f.ref?.type}>
              {f.label}: {f.value}
            </span>
          ))}
        </div>
      ) : null}
      {s.actions.length ? (
        <div className={styles.row} data-testid="handoff-summary-actions">
          {s.actions.map((a, i) => (
            <span
              key={`${a.action_id}-${i}`}
              className={cx(styles.pill, a.status !== 'ok' && styles.bad)}
              data-status={a.status}
            >
              {a.action_id} · {t(`status.${a.status}` as never)}
            </span>
          ))}
        </div>
      ) : null}
      {s.unresolved ? (
        <div data-testid="handoff-summary-unresolved">{t('unresolved', { text: s.unresolved })}</div>
      ) : null}
      {s.attachments_unreadable ? (
        <div className={styles.muted} data-testid="handoff-summary-attachments">
          {t('attachmentUnreadable', { n: s.attachments_unreadable })}
        </div>
      ) : null}
    </div>
  );
}
