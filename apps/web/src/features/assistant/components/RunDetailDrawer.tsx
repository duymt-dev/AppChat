// Drawer chi tiết một run (TIP-019b §5.4, AC8): trạng thái thật + lý do dừng, mốc thời gian, credit của việc / cả cây (usage chưa thu,
// đang đối soát), kết quả (khi xong), các bước, việc con (mở tiếp được). Đọc qua GET /v1/runs/:id có scope — WS run.step / run.done làm
// mới khoá ['runs'].
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { EntityDrawer, color, font, radius } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import { useRunDetail } from '../hooks/useRunDetail';
import { RunStatusBadge, useStopReasonLabel } from './RunStatusBadge';
import { RunStepList } from './RunStepList';
import { CitationList } from '@/shared/ai-citations/CitationList';

const useStyles = createStyles(({ css }) => ({
  body: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 16px;
  `,
  k: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  v: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
  h: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    margin-bottom: 8px;
  `,
  note: css`
    font-size: ${font.scale.s13}px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.alertBg};
    color: ${color.amberText};
  `,
  result: css`
    font-size: ${font.scale.s13}px;
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBgSoft};
    white-space: pre-wrap;
  `,
  child: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    margin-bottom: 4px;
  `,
  childTask: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s13}px;
  `,
  muted: css`
    color: ${color.text4};
    font-size: ${font.scale.s13}px;
  `,
}));

function Field({ k, v, testId }: { k: string; v: string; testId?: string }) {
  const { styles } = useStyles();
  return (
    <div>
      <div className={styles.k}>{k}</div>
      <div className={styles.v} data-testid={testId}>
        {v}
      </div>
    </div>
  );
}

export function RunDetailDrawer({ runId, onOpen, onClose }: { runId: string | null; onOpen: (id: string) => void; onClose: () => void }) {
  const t = useTranslations('assistant.cw.run');
  const { styles } = useStyles();
  const fmt = useFmt();
  const reason = useStopReasonLabel();
  const { detail: d, failed, steps, moreSteps, children } = useRunDetail(runId);
  const when = (iso: string | null) => (iso ? `${fmt.date(iso)} ${fmt.time(iso)}` : '—');
  const credits = (n: number) => t('detail.creditsN', { n });
  return (
    <EntityDrawer open={!!runId} onClose={onClose} title={d?.task || t('detail.title')} subtitle={d?.agent || undefined} tinted closeLabel={t('close')} testId="run-detail">
      <div className={styles.body}>
        {failed ? <div className={styles.muted}>{t('detail.loadFailed')}</div> : null}
        {d ? (
          <>
            <div>
              <RunStatusBadge lifecycle={d.lifecycle} stopReason={d.stop_reason} />
            </div>
            {d.stop_reason ? (
              <div className={styles.note} data-testid="run-stop-reason">
                {reason(d.stop_reason)}
              </div>
            ) : null}
            <div className={styles.grid}>
              <Field k={t('detail.started')} v={when(d.started_at)} />
              <Field k={t('detail.finished')} v={when(d.finished_at)} />
              <Field k={t('detail.credits')} v={credits(d.credits_local)} testId="run-credits" />
              <Field k={t('detail.subtree')} v={credits(d.credits_subtree)} />
              {d.credits_unbilled ? <Field k={t('detail.unbilled')} v={credits(d.credits_unbilled)} /> : null}
              {d.error_code ? <Field k={t('detail.error')} v={d.error_code} /> : null}
            </div>
            {d.accounting_pending ? <div className={styles.note}>{t('detail.pending')}</div> : null}
            {d.result_text ? (
              <div>
                <div className={styles.h}>{t('detail.result')}</div>
                <div className={styles.result} data-testid="run-result">
                  {d.result_text}
                </div>
                <CitationList citations={d.citations} text={d.result_text} testId="run-citations" />
              </div>
            ) : (
              <CitationList citations={d.citations} testId="run-citations" />
            )}
            <div>
              <div className={styles.h}>{t('detail.steps', { n: d.steps })}</div>
              <RunStepList steps={steps} onMore={moreSteps} />
            </div>
            {children.length ? (
              <div>
                <div className={styles.h}>{t('detail.children', { n: d.children })}</div>
                {children.map((c) => (
                  <button key={c.id} type="button" className={styles.child} onClick={() => onOpen(c.id)} data-testid="run-child">
                    <span className={styles.childTask}>{c.task}</span>
                    <RunStatusBadge lifecycle={c.lifecycle} />
                  </button>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </EntityDrawer>
  );
}
