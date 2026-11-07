// Nhãn trạng thái thật của run (TIP-019b §5.4): chờ duyệt / chờ agent con / chờ thao tác / chờ đối soát / lỗi / đã dừng tách riêng —
// không gộp thành "Hoàn tất". Lý do dừng (nếu có) hiện ở tooltip.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { font, radius } from '@appchat/ui';
import type { RunLifecycle } from '../run-types';
import { RUN_TONE } from './run-tone';

const useStyles = createStyles(({ css }) => ({
  badge: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r12 * 2}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
}));

const KNOWN_REASONS = ['max_steps', 'loop_guard', 'budget', 'cancelled', 'approval_expired'];

export function useStopReasonLabel() {
  const t = useTranslations('assistant.cw.run.stopReason');
  return (reason: string | null) => (reason ? (KNOWN_REASONS.includes(reason) ? t(reason) : t('other', { reason })) : null);
}

export function RunStatusBadge({ lifecycle, stopReason }: { lifecycle: RunLifecycle; stopReason?: string | null }) {
  const t = useTranslations('assistant.cw.run.life');
  const { styles } = useStyles();
  const reason = useStopReasonLabel()(stopReason ?? null);
  const tone = RUN_TONE[lifecycle];
  return (
    <span className={styles.badge} style={{ color: tone.fg, background: tone.bg }} title={reason ?? undefined} data-testid="run-status" data-lifecycle={lifecycle}>
      {t(lifecycle)}
    </span>
  );
}
