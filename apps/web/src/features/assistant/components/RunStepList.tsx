// Danh sách bước của run (TIP-019b §5.4): loại bước + action đã gọi + kết quả rút gọn + credit — không input / output thô.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { useFmt } from '@/shared/i18n/useFmt';
import type { RunStep } from '../run-types';

const useStyles = createStyles(({ css }) => ({
  list: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
  `,
  idx: css`
    width: 20px;
    color: ${color.text4};
    font-size: ${font.scale.s12}px;
    flex-shrink: 0;
  `,
  label: css`
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  side: css`
    color: ${color.text4};
    font-size: ${font.scale.s12}px;
    white-space: nowrap;
  `,
  bad: css`
    color: ${color.dangerDeep};
  `,
  empty: css`
    color: ${color.text4};
    font-size: ${font.scale.s13}px;
  `,
  more: css`
    align-self: flex-start;
    border: none;
    background: transparent;
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s12}px;
    cursor: pointer;
    padding: 4px 0;
    font-family: inherit;
  `,
}));

const OUTCOMES = ['ok', 'needs_approval', 'needs_confirmation', 'job_accepted', 'operation_pending', 'waiting_child'];

export function RunStepList({ steps, onMore }: { steps: RunStep[]; onMore: (() => void) | null }) {
  const t = useTranslations('assistant.cw.run.detail');
  const { styles, cx } = useStyles();
  const fmt = useFmt();
  if (!steps.length) return <div className={styles.empty}>{t('noSteps')}</div>;
  const label = (s: RunStep) => (s.type === 'llm' ? t('stepLlm') : s.type === 'tool' ? t('stepTool', { action: s.action_id ?? '' }) : t('stepOther', { type: s.type }));
  const outcome = (o: string) => (o.startsWith('error:') ? t('outcome.error', { code: o.slice(6) }) : OUTCOMES.includes(o) ? t(`outcome.${o}`) : o);
  return (
    <div className={styles.list} data-testid="run-steps">
      {steps.map((s) => (
        <div key={s.idx} className={styles.row} data-testid="run-step">
          <span className={styles.idx}>{s.idx + 1}</span>
          <span className={styles.label}>{label(s)}</span>
          {s.outcome ? <span className={cx(styles.side, s.outcome.startsWith('error:') && styles.bad)}>{outcome(s.outcome)}</span> : null}
          {s.credits ? <span className={styles.side}>{t('creditsN', { n: s.credits })}</span> : null}
          <span className={styles.side}>{fmt.time(s.created_at)}</span>
        </div>
      ))}
      {onMore ? (
        <button type="button" className={styles.more} onClick={onMore}>
          {t('more')}
        </button>
      ) : null}
    </div>
  );
}
