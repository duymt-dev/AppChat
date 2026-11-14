// Thanh 6 giai đoạn (TIP-026c §5.1) — thẻ 360° (prototype L2396: 6 đoạn 10px, bo hai đầu, tô tới giai đoạn hiện tại) và drawer (L2876:
// nút có chữ). Bấm = set_stage; Đã mua cần chứng từ (server 422 → toast lỗi). Thua / không sửa được → chỉ xem.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius, layout } from '@appchat/ui';
import { opportunityRank, type OpportunityStage } from '@appchat/shared';
import { PIPELINE_STEPS, stageColor } from './types';

const useStyles = createStyles(({ css }) => ({
  bar: css`
    display: flex;
    gap: 2px;
  `,
  seg: css`
    flex: 1;
    height: 10px;
    border: none;
    padding: 0;
    cursor: pointer;
    border-radius: ${radius.r4}px;
    &:first-child {
      border-radius: ${radius.r6}px ${radius.r4}px ${radius.r4}px ${radius.r6}px;
    }
    &:last-child {
      border-radius: ${radius.r4}px ${radius.r6}px ${radius.r6}px ${radius.r4}px;
    }
    &:disabled {
      cursor: default;
    }
  `,
  steps: css`
    display: flex;
    gap: 4px;
  `,
  step: css`
    flex: 1;
    min-width: 0;
    min-height: ${layout.chip}px;
    border: none;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    font-family: inherit;
    padding: 2px 4px;
    line-height: 1.15;
    &:disabled {
      cursor: default;
    }
  `,
  cur: css`
    font-weight: ${font.weight.heavy};
  `,
}));

export function StageBar({ stage, onPick, disabled, labeled }: { stage: OpportunityStage; onPick: (s: OpportunityStage) => void; disabled?: boolean; labeled?: boolean }) {
  const t = useTranslations('common.opportunity');
  const { styles, cx } = useStyles();
  const at = opportunityRank(stage);
  const c = stageColor(stage);
  return (
    <div className={labeled ? styles.steps : styles.bar} role="group" aria-label={t('stageLabel')} data-testid="opp-stagebar">
      {PIPELINE_STEPS.map((s, i) => {
        const done = at >= 0 && i <= at;
        const cur = s === stage;
        const label = `${t(`stage.${s}`)} · ${t(`prob.${s}`)}`;
        if (!labeled)
          return <button key={s} type="button" className={styles.seg} style={{ background: done ? c : color.border }} title={label} aria-label={label} aria-pressed={cur} disabled={disabled || cur} onClick={() => onPick(s)} data-testid={`opp-seg-${s}`} />;
        const sc = stageColor(s);
        return (
          <button key={s} type="button" className={cx(styles.step, cur && styles.cur)} style={{ background: cur ? sc : done ? `${sc}22` : color.muteBg, color: cur ? color.white : done ? sc : color.text3 }} title={label} aria-pressed={cur} disabled={disabled || cur} onClick={() => onPick(s)} data-testid={`opp-step-${s}`}>
            {t(`stage.${s}`)}
          </button>
        );
      })}
    </div>
  );
}
