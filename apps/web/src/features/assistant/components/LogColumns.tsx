// Cột bảng Nhật ký hành động — prototype L1480–1496: Loại · Hành động · Đối tượng · Thời gian · Trạng thái · Hoàn tác; thẻ < md.
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

function useParts(onUndo: (r: ActionLogRow) => void) {
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
      ) : null,
    when: (r: ActionLogRow) => t('when', { day: t(`day.${r.day}` as never), time: r.time }),
  };
}

export function useLogColumns(onUndo: (r: ActionLogRow) => void): TableColumnsType<ActionLogRow> {
  const { styles } = useLogStyles();
  const p = useParts(onUndo);
  const { t } = p;
  return useMemo(
    () => [
      { key: 'kind', title: t('col.kind'), width: 136, render: (_, r) => p.kind(r) },
      { key: 'title', title: t('col.title'), render: (_, r) => <span className={styles.rowTitle}>{r.title ?? t('dash')}</span> },
      { key: 'object', title: t('col.object'), width: 300, render: (_, r) => <span className={styles.obj}>{r.object ?? r.action_id}</span> },
      { key: 'time', title: t('col.time'), width: 160, render: (_, r) => <span className={styles.time}>{p.when(r)}</span> },
      { key: 'status', title: t('col.status'), width: 130, render: (_, r) => p.status(r) },
      { key: 'undo', title: <span className={styles.right}>{t('col.undo')}</span>, width: 106, align: 'right', render: (_, r) => p.undo(r) },
    ],
    [t, styles, p],
  );
}

export function LogCard({ r, onUndo }: { r: ActionLogRow; onUndo: (r: ActionLogRow) => void }) {
  const { styles } = useLogStyles();
  const p = useParts(onUndo);
  return (
    <div className={styles.card} data-log={r.id}>
      <div className={styles.cardRow}>
        {p.kind(r)}
        <span style={{ flex: 1 }} />
        {p.status(r)}
      </div>
      <div className={styles.rowTitle}>{r.title ?? p.t('dash')}</div>
      <div className={styles.cardRow}>
        <span className={styles.obj} style={{ flex: 1 }}>
          {r.object ?? r.action_id} · {p.when(r)}
        </span>
        {p.undo(r)}
      </div>
    </div>
  );
}
