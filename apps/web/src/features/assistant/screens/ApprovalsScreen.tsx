// Chờ duyệt (Blueprint §7.2 assistant/approvals — màn mới, không đo pixel; theo pattern Nhật ký hành động).
// Duyệt cần `approvals.decide` + permission duyệt của action gốc (Blueprint §3.4); không đủ quyền → nút khoá + lý do.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useAssistantStyles } from '../styles/assistant.styles';
import { useLogStyles } from '../styles/log.styles';
import { useApprovalStyles } from '../styles/approval.styles';
import { approvalsQuery } from '../api';
import { AssistantTopBar } from '../components/AssistantTopBar';
import type { ApprovalRow } from '../types';

const TABS = ['pending', 'approved', 'rejected'] as const;
const RISK_TONE: Record<string, [string, string]> = {
  send: [color.pink, color.roseBg],
  money: [color.amberText, color.amberBg],
};

function ApprovalCard({ a }: { a: ApprovalRow }) {
  const t = useTranslations('assistant.ap');
  const tl = useTranslations('assistant.log');
  const { styles } = useApprovalStyles();
  const approve = useAction('approval.approve');
  const reject = useAction('approval.reject');
  const [fg, bg] = RISK_TONE[a.risk] ?? [color.text3, color.mutedBg];
  const busy = approve.isPending || reject.isPending;
  return (
    <div className={styles.card} data-testid="ap-card" data-approval={a.id}>
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="ic-shield" size={17} color={color.violet} />
        </span>
        <div className={styles.grow}>
          <div className={styles.title}>{a.title}</div>
          <div className={styles.meta}>
            {t('by', { agent: a.agent })} · {tl('when', { day: tl(`day.${a.day}` as never), time: a.time })}
          </div>
        </div>
        <span className={styles.risk} style={{ color: fg, background: bg }}>
          {t(`risk.${a.risk}` as never)}
        </span>
      </div>
      <div className={styles.summary}>{a.summary}</div>
      <div className={styles.reason}>
        <b>{t('reason')}</b>: {a.reason}
      </div>
      {a.status === 'pending' ? (
        <div className={styles.foot}>
          {a.can_decide ? null : <span className={styles.noRight}>{t('noRight')}</span>}
          <span className={styles.grow} />
          <button type="button" className={styles.reject} disabled={!a.can_decide || busy} onClick={() => void reject.run({ approval_id: a.id })} data-testid="ap-reject">
            {t('reject')}
          </button>
          <button type="button" className={styles.approve} disabled={!a.can_decide || busy} onClick={() => void approve.run({ approval_id: a.id })} data-testid="ap-approve">
            <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
            {t('approve')}
          </button>
        </div>
      ) : (
        <div className={styles.foot}>
          <span className={styles.done}>{t(`status.${a.status}`)}</span>
        </div>
      )}
    </div>
  );
}

export function ApprovalsScreen() {
  const t = useTranslations('assistant.ap');
  const { styles: page } = useAssistantStyles();
  const { styles: log, cx } = useLogStyles();
  const { styles } = useApprovalStyles();
  const [tab, setTab] = useState<(typeof TABS)[number]>('pending');
  const q = useQuery(approvalsQuery(tab));
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
