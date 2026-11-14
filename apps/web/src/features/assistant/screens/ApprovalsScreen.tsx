// Chờ duyệt (Blueprint §7.2 assistant/approvals — màn mới, không đo pixel; theo pattern Nhật ký hành động).
// Duyệt cần `approvals.decide` + permission duyệt của action gốc (Blueprint §3.4); không đủ quyền → nút khoá + lý do. Tab: chờ /
// đã duyệt (gồm sửa & duyệt) / từ chối / hết hạn (72 giờ không ai quyết — D52).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useLogStyles } from '../styles/log.styles';
import { useApprovalStyles } from '../styles/approval.styles';
import { approvalsQuery } from '../api';
import { AssistantTopBar } from '../components/AssistantTopBar';
import { ApprovalCard } from '../components/ApprovalCard';
import type { ApprovalRow } from '../types';

const TABS = ['pending', 'approved', 'rejected', 'expired'] as const;
/** Chưa có socket ở chế độ http (TIP-025) — làm mới định kỳ + khi quay lại tab. */
const REFRESH_MS = 30_000;

export function ApprovalsScreen() {
  const t = useTranslations('assistant.ap');
  const { styles: page } = useAssistantStyles();
  const { styles: log, cx } = useLogStyles();
  const { styles } = useApprovalStyles();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const q = useQuery({ ...approvalsQuery(tab), refetchInterval: REFRESH_MS, refetchOnWindowFocus: true });
  const rows = q.data?.data ?? [];

  return (
    <div className={page.root} data-testid="approvals">
      <AssistantTopBar crumb="approvals" />
      <div className={log.page}>
        <div className={log.title}>{t('title')}</div>
        <div className={log.sub}>{t('sub')}</div>
        <div className={log.pills} role="tablist">
          {TABS.map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} className={cx(log.pill, tab === k && log.pillOn)} onClick={() => setTab(k)}>
              {t(`tabs.${k}`)}
            </button>
          ))}
        </div>
        <PageStates state={stateOf(q, (d: { data: ApprovalRow[] }) => d.data.length === 0)} onRetry={() => void q.refetch()} empty={<div className={styles.empty}>{t('empty')}</div>}>
          <div className={styles.list}>
            {rows.map((a) => (
              <ApprovalCard key={a.id} a={a} />
            ))}
          </div>
        </PageStates>
      </div>
    </div>
  );
}
