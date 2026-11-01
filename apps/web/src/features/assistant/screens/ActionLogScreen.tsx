// Nhật ký hành động (orchestrator) — prototype L1464–1500: tìm, lọc trạng thái / thời gian, chip loại, DataTable + Hoàn tác.
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { DataTable, Icon, color } from '@appchat/ui';
import { getAction } from '@appchat/actions';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { matchesInvalidation } from '@/shared/api/query-keys';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useLogStyles } from '../styles/log.styles';
import { actionLogsQuery, type LogFilter } from '../api';
import { AssistantTopBar } from '../components/AssistantTopBar';
import { LogCard, useLogColumns } from '../components/LogColumns';
import type { ActionLogRow } from '../types';

const EMPTY: LogFilter = { kind: 'all', status: 'all', day: 'all', q: '' };
const KINDS = ['all', 'create', 'update', 'send', 'export', 'delete'] as const;
const STATUSES = ['all', 'done', 'pending', 'undone'] as const;
const DAYS = ['all', 'today', 'yesterday', '7d'] as const;

export function ActionLogScreen() {
  const t = useTranslations('assistant.log');
  const tAll = useTranslations();
  const { message } = App.useApp();
  const qc = useQueryClient();
  const { styles: page } = useAssistantStyles();
  const { styles, cx } = useLogStyles();
  const [f, setF] = useState<LogFilter>(EMPTY);
  const q = useQuery(actionLogsQuery(f));
  const rows = q.data?.data ?? [];

  // POST /v1/action-logs/:id/undo — hoàn tác theo nhật ký, không phải action mới (Blueprint §4.3). Làm mới cả dữ liệu action gốc
  // chạm tới (invalidates của ActionDef); quá hạn / không hỗ trợ / không phải việc của mình → báo theo mã lỗi.
  const undo = async (r: ActionLogRow) => {
    try {
      await transport.undo(r.id);
    } catch (e) {
      message.error(tAll(`errors.${e instanceof ApiRequestError ? e.error.code : 'INTERNAL'}` as never));
      return;
    }
    const inv = getAction(r.action_id)?.invalidates ?? [];
    await qc.invalidateQueries({ predicate: (q) => q.queryKey[0] === 'action-logs' || matchesInvalidation(inv, q.queryKey) });
    message.success(t('undone', { title: r.title ?? r.action_id }));
  };
  const columns = useLogColumns(undo);

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
            mobileCard={(r) => <LogCard r={r} onUndo={undo} />}
            emptyText={t('empty')}
          />
        </PageStates>
      </div>
    </div>
  );
}
