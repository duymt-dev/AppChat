// Một bước kế hoạch (TIP-023d §6.1): vị trí, tiêu đề, trạng thái THẬT từ server (biên nhận) — chờ xác nhận / duyệt / việc ngoài / chưa rõ
// tách nhãn riêng, không gộp thành "xong". Màu theo nhóm trạng thái (token RUN_TONE), không mã màu rời.
'use client';
import { useTranslations } from 'next-intl';
import { RUN_TONE } from '../../components/run-tone';
import { usePlanStyles } from '../plan.styles';
import type { PlanStep as Step } from '../types';

const TONE: Record<Step['state'], keyof typeof RUN_TONE> = {
  pending: 'queued',
  running: 'running',
  waiting_confirmation: 'waiting_approval',
  waiting_approval: 'waiting_approval',
  waiting_external: 'waiting_operation',
  succeeded: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  skipped: 'cancelled',
  unknown: 'waiting_operation',
};

export function PlanStep({ step, children }: { step: Step; children?: React.ReactNode }) {
  const t = useTranslations('assistant.plan.state');
  const { styles } = usePlanStyles();
  const tone = RUN_TONE[TONE[step.state]];
  return (
    <li className={styles.step} data-testid="plan-step" data-state={step.state}>
      <span className={styles.pos}>{step.position}</span>
      <span className={styles.stepTitle} title={step.title}>
        {step.title}
      </span>
      <span className={styles.pill} style={{ color: tone.fg, background: tone.bg }}>
        {t(step.state)}
      </span>
      {children}
    </li>
  );
}
