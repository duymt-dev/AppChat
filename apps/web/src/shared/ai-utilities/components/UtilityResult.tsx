// Kết quả kỹ năng tiện ích (TIP-019c §4.3): chỉ hiển thị đề xuất ĐÃ KIỂM theo khuôn (không JSON / HTML thô) + bằng chứng trích + điều
// chưa chắc; trạng thái trung thực (đang chạy / chưa xong / sai / vô hiệu / huỷ / không rõ — không bao giờ giả "xong"). Sao chép = nút rõ.
// Không tự điều hướng / lưu / gửi gì — mọi ghi nghiệp vụ là lựa chọn riêng của người dùng sau đó.
'use client';
import { useTranslations } from 'next-intl';
import { useUtilityStyles } from '../styles';
import type { UtilityEnvelope, UtilityPhase } from '../types';
import { ProposalView, proposalText } from './ProposalView';

export function UtilityResult({ phase, envelope }: { phase: UtilityPhase; envelope: UtilityEnvelope | null }) {
  const t = useTranslations('assistant.utility');
  const { styles } = useUtilityStyles();
  if (phase === 'idle') return null;
  if (phase === 'running') return <div className={styles.hint} data-testid="utility-state-running">{t('running')}</div>;
  if (phase === 'error' && !envelope) return <div className={styles.error} data-testid="utility-state-error">{t('error')}</div>;
  if (!envelope) return null;
  const state = phase === 'pending' && envelope.state === 'completed' ? 'pending' : envelope.state;
  if (state !== 'completed' || !envelope.proposal) {
    return (
      <div className={state === 'pending' || state === 'unknown' ? styles.hint : styles.error} data-testid={`utility-state-${state}`}>
        {t(`state.${state}`)}
        {envelope.reason ? ` — ${t(`reason.${envelope.reason}` as never)}` : null}
      </div>
    );
  }
  const copy = () => void navigator.clipboard?.writeText(proposalText(envelope.proposal, (k, v) => t(k as never, v as never)));
  return (
    <div data-testid="utility-state-completed">
      <div className={styles.section}>{t('result')}</div>
      <ProposalView proposal={envelope.proposal} />
      <div className={styles.row}>
        <button type="button" className={styles.ghost} onClick={copy} data-testid="utility-copy">
          {t('copy')}
        </button>
        <span className={styles.hint}>{t('reviewHint')}</span>
      </div>
    </div>
  );
}
