// Nhật ký hành động (orchestrator) — prototype L1464–1500: tìm, lọc trạng thái / thời gian, chip loại, DataTable + Hoàn tác; hành động đã
// gửi ra ngoài → "Ghi đính chính" (TIP-003e, CorrectionModal).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable, Icon, color } from '@appchat/ui';
import { useUndoAction } from '@/shared/actions/useUndoAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useLogStyles } from '../styles/log.styles';
import { actionLogsQuery, type LogFilter } from '../api';
import { AssistantTopBar } from '../components/AssistantTopBar';
import { LogCard, useLogColumns } from '../components/LogColumns';
import { CorrectionModal } from '../components/CorrectionModal';
import type { ActionLogRow } from '../types';

const EMPTY: LogFilter = { kind: 'all', status: 'all', day: 'all', q: '' };
const KINDS = ['all', 'create', 'update', 'send', 'export', 'delete'] as const;
const STATUSES = ['all', 'done', 'pending', 'undone'] as const;
const DAYS = ['all', 'today', 'yesterday', '7d'] as const;

export function ActionLogScreen() {
  const t = useTranslations('assistant.log');
  const { styles: page } = useAssistantStyles();
  const { styles, cx } = useLogStyles();
  const [f, setF] = useState<LogFilter>(EMPTY);
  const q = useQuery(actionLogsQuery(f));
  const rows = q.data?.data ?? [];

  // POST /v1/action-logs/:id/undo — hoàn tác theo nhật ký, không phải action mới (Blueprint §4.3); cha có action hoàn tác riêng (TIP-034c)
  // → useUndoAction bắc cầu sang action đó (xem trước + xác nhận). Toast + làm mới dữ liệu action gốc / nhật ký ở hook dùng chung.
  const runUndo = useUndoAction();
  const undo = async (r: ActionLogRow) => {
    await runUndo(r.id, r.action_id, r.title ?? r.action_id);
  };
  const [correcting, setCorrecting] = useState<ActionLogRow | null>(null);
  const columns = useLogColumns({ onUndo: undo, onCorrect: setCorrecting });

  return (
    <div className={page.root} data-testid="action-log">
      <AssistantTopBar crumb="actions" />
      <div className={styles.page}>
        <div className={styles.title}>{t('title')}</div>
        <div className={styles.sub}>{t('sub')}</div>
        <div className={styles.bar}>
          <div className={styles.search}>
            <Icon name="ic-search" size={15} color={color.text4} strokeWidth={1.9} className={styles.searchIcon} />
            <input className={styles.input} value={f.q} placeholder={t('search')} aria-label={t('search')} onChange={(e) => setF({ ...f, q: e.target.value })} data-testid="log-search" />
          </div>
          <select className={styles.select} value={f.status} aria-label={t('col.status')} onChange={(e) => setF({ ...f, status: e.target.value })} data-testid="log-status">
            {STATUSES.map((k) => (
              <option key={k} value={k}>
                {t(`status.${k}`)}
              </option>
            ))}
          </select>
          <select className={styles.select} value={f.day} aria-label={t('col.time')} onChange={(e) => setF({ ...f, day: e.target.value })}>
            {DAYS.map((k) => (
              <option key={k} value={k}>
                {t(`day.${k}`)}
              </option>
            ))}
          </select>
          <button type="button" className={styles.reset} onClick={() => setF(EMPTY)}>
            <Icon name="ic-refresh" size={13} color={color.text4} strokeWidth={1.9} />
            {t('reset')}
          </button>
          <span className={styles.grow} />
          <span className={styles.count}>{t('count', { n: rows.length, total: q.data?.total ?? 0 })}</span>
        </div>
        <div className={styles.pills} role="tablist">
          {KINDS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={f.kind === k} className={cx(styles.pill, f.kind === k && styles.pillOn)} onClick={() => setF({ ...f, kind: k })}>
              {t(`kind.${k}`)}
            </button>
          ))}
        </div>
        <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
          <DataTable<ActionLogRow>
            testId="log-table"
            rows={rows}
            columns={columns}
            rowKey={(r) => r.id}
            minWidth={900}
            rowProps={(r) => ({ 'data-log': r.id })}
            mobileCard={(r) => <LogCard r={r} onUndo={undo} onCorrect={setCorrecting} />}
            emptyText={t('empty')}
          />
        </PageStates>
      </div>
      {correcting ? <CorrectionModal row={correcting} onClose={() => setCorrecting(null)} /> : null}
    </div>
  );
}
