// Khung "Trợ lý AI đang điều phối" ở tab Cowork của Composer (REQ-E14) — hàng thu gọn mở modal danh sách run.
// Prototype L1521–1528 (hàng), L736–753 (modal): Dừng (run.cancel) / Duyệt & gửi (approval.approve) / Xem kết quả.
'use client';
import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useRunsStyles } from '../styles/runs.styles';
import { useAssistantUi } from '../assistant-store';
import { runsQuery } from '../api';
import type { Run } from '../types';

const TINT_FALLBACK: [string, string] = ['#F3F4F6', '#4A5057'];
const AGENT_TINT: Record<string, [string, string]> = {
  'Operations Agent': ['#FEF3E7', '#C8820B'],
  'Sales Agent': ['#EDFAF3', '#157A40'],
  'Support Agent': ['#E7F0FF', '#2563EB'],
  'Marketing Agent': ['#EDE9FC', '#6E48E6'],
};

const STATUS_STYLE: Record<Run['status'], { fg: string; bg: string; bar: string }> = {
  running: { fg: '#1D4ED8', bg: '#EFF4FC', bar: '#3B82F6' },
  waiting_approval: { fg: '#B45309', bg: '#FFFBEB', bar: '#F59E0B' },
  done: { fg: '#157A40', bg: '#EDFAF3', bar: '#2DC56A' },
};

export function RunsOrchestrationBar() {
  const t = useTranslations('assistant.cw.run');
  const { styles, cx } = useRunsStyles();
  const open = useAssistantUi((s) => s.runsOpen);
  const set = useAssistantUi((s) => s.set);
  const root = useAssistantUi((s) => s.lastRunId);
  const q = useQuery(runsQuery(root));
  const cancel = useAction('run.cancel');
  const approve = useAction('approval.approve');
  const rows = q.data?.data ?? [];
  if (!rows.length) return null;
  const running = rows.filter((r) => r.status === 'running').length;
  const needApprove = rows.filter((r) => r.status === 'waiting_approval').length;
  const summary = t('summary', { total: rows.length, running, needApprove });

  const act = (r: Run) => {
    if (r.status === 'waiting_approval' && r.approval_id) void approve.run({ approval_id: r.approval_id });
    else if (r.status === 'running') void cancel.run({ run_id: r.id });
  };

  return (
    <>
      <div className={styles.bar} data-testid="cw-run-bar">
        <button type="button" className={styles.barHead} onClick={() => set({ runsOpen: true })}>
          <span className={styles.icon}>
            <Icon name="ic-spark" size={16} color={color.brand} />
          </span>
          <span className={styles.grow}>
            <div className={styles.title}>{t('title')}</div>
            <div className={styles.summary}>{summary}</div>
          </span>
          <span className={styles.caret}>{t('seeDetail')}</span>
        </button>
      </div>
      {open ? (
        <div className={styles.veil} onClick={() => set({ runsOpen: false })}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()} data-testid="cw-run-modal">
            <div className={styles.modalHead}>
              <span className={styles.icon}>
                <Icon name="ic-spark" size={17} color={color.brand} />
              </span>
              <span className={styles.grow}>
                <div className={styles.title}>{t('title')}</div>
                <div className={styles.summary}>{summary}</div>
              </span>
              <button type="button" className={styles.x} aria-label={t('close')} onClick={() => set({ runsOpen: false })}>
                <Icon name="ic-x" size={16} strokeWidth={2.2} />
              </button>
            </div>
            <div className={styles.list}>
              {rows.map((r) => {
                const tint = AGENT_TINT[r.agent] ?? TINT_FALLBACK;
                const st = STATUS_STYLE[r.status];
                return (
                  <div key={r.id} className={styles.row} data-testid="cw-run-row" data-run={r.id}>
                    <div className={styles.grow}>
                      <div className={styles.task}>{r.task}</div>
                      <div className={styles.meta}>
                        <span className={styles.agent} style={{ background: tint[0], color: tint[1] }}>
                          {r.agent}
                        </span>
                        <span className={styles.metaTxt}>{r.meta}</span>
                      </div>
                      <div className={styles.bar2}>
                        <span style={{ width: `${r.status === 'running' ? r.pct : 100}%`, background: st.bar }} />
                      </div>
                    </div>
                    <span className={styles.st} style={{ color: st.fg, background: st.bg }}>
                      {t(`status.${r.status}`)}
                    </span>
                    {r.status === 'done' ? (
                      <span className={styles.act} data-testid="cw-run-act">
                        {t('action.viewResult')}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={cx(styles.act, r.status === 'waiting_approval' && styles.actPrimary)}
                        onClick={() => act(r)}
                        data-testid="cw-run-act"
                      >
                        {t(r.status === 'waiting_approval' ? 'action.approveSend' : 'action.stop')}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
