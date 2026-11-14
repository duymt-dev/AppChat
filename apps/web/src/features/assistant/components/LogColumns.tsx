// Cột bảng Nhật ký hành động — prototype L1480–1496: Loại · Hành động · Đối tượng · Thời gian · Trạng thái · Hoàn tác; thẻ < md.
// TIP-003e (REQ-E09c): hành động đã gửi ra ngoài không có Hoàn tác — cột đó hiện "Ghi đính chính"; đính chính đã ghi hiện dưới tiêu đề.
'use client';
import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color, type IconName, type TableColumnsType } from '@appchat/ui';
import { useLogStyles } from '../styles/log.styles';
import type { ActionLogRow, LogKind } from '../types';

const KIND: Record<LogKind, [string, IconName]> = {
  create: [color.okStrong, 'ic-plus'],
  update: [color.blue, 'ic-doc'],
  send: [color.pink, 'ic-send'],
  export: [color.violet, 'ic-chart'],
  delete: [color.dangerStrong, 'ic-trash'],
};

const statusOf = (r: ActionLogRow) => (r.undone ? 'undone' : r.status);
const STATUS_TONE = {
  done: [color.brandInk, color.doneBg],
  pending: [color.amberText, color.amberBg],
  undone: [color.text3, color.mutedBg],
} as const;

type Handlers = { onUndo: (r: ActionLogRow) => void; onCorrect: (r: ActionLogRow) => void };

function useParts({ onUndo, onCorrect }: Handlers) {
  const t = useTranslations('assistant.log');
  const { styles } = useLogStyles();
  return {
    t,
    kind: (r: ActionLogRow) => {
      const [c, ic] = KIND[r.kind];
      return (
        <span className={styles.kind} style={{ color: c }}>
          <span className={styles.kindIcon} style={{ background: `${c}14` }}>
            <Icon name={ic} size={16} color={c} />
          </span>
          {t(`kind.${r.kind}`)}
        </span>
      );
    },
    status: (r: ActionLogRow) => {
      const s = statusOf(r);
      const [fg, bg] = STATUS_TONE[s];
      return (
        <span className={styles.badge} style={{ color: fg, background: bg }} data-testid="log-status-badge">
          {t(`status.${s}`)}
        </span>
      );
    },
    undo: (r: ActionLogRow) =>
      r.undoable && !r.undone ? (
        <button
          type="button"
          className={styles.undo}
          onClick={(e) => {
            e.stopPropagation();
            onUndo(r);
          }}
          data-testid="log-undo"
        >
          <Icon name="ic-refresh" size={12} color={color.text3} strokeWidth={2} />
          {t('undo')}
        </button>
      ) : r.undone ? (
        <span className={styles.dash}>{t('dash')}</span>
      ) : r.correctable ? (
        <button
          type="button"
          className={styles.undo}
          onClick={(e) => {
            e.stopPropagation();
            onCorrect(r);
          }}
          data-testid="log-correct-open"
        >
          <Icon name="ic-edit" size={12} color={color.text3} strokeWidth={2} />
          {t('correctBtn')}
        </button>
      ) : null,
    title: (r: ActionLogRow) => (
      <>
        <span className={styles.rowTitle}>{r.title ?? t('dash')}</span>
        {r.corrections?.map((c) => (
          <div key={c.at} className={styles.obj} data-testid="log-correction">
            {t('corrected', { note: c.note })}
          </div>
        ))}
      </>
    ),
    when: (r: ActionLogRow) => t('when', { day: t(`day.${r.day}` as never), time: r.time }),
  };
}

export function useLogColumns(h: Handlers): TableColumnsType<ActionLogRow> {
  const { styles } = useLogStyles();
  const p = useParts(h);
  const { t } = p;
  return useMemo(
    () => [
      { key: 'kind', title: t('col.kind'), width: 136, render: (_, r) => p.kind(r) },
      { key: 'title', title: t('col.title'), render: (_, r) => p.title(r) },
      { key: 'object', title: t('col.object'), width: 300, render: (_, r) => <span className={styles.obj}>{r.object ?? r.action_id}</span> },
      { key: 'time', title: t('col.time'), width: 160, render: (_, r) => <span className={styles.time}>{p.when(r)}</span> },
      { key: 'status', title: t('col.status'), width: 130, render: (_, r) => p.status(r) },
      { key: 'undo', title: <span className={styles.right}>{t('col.undo')}</span>, width: 106, align: 'right', render: (_, r) => p.undo(r) },
    ],
    [t, styles, p],
  );
}

export function LogCard({ r, ...h }: { r: ActionLogRow } & Handlers) {
  const { styles } = useLogStyles();
  const p = useParts(h);
  return (
    <div className={styles.card} data-log={r.id}>
      <div className={styles.cardRow}>
        {p.kind(r)}
        <span style={{ flex: 1 }} />
        {p.status(r)}
      </div>
      <div>{p.title(r)}</div>
      <div className={styles.cardRow}>
        <span className={styles.obj} style={{ flex: 1 }}>
          {r.object ?? r.action_id} · {p.when(r)}
        </span>
        {p.undo(r)}
      </div>
    </div>
  );
}
