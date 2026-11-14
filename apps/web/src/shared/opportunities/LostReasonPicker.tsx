// Chọn lý do Thua (TIP-026c §2, prototype L2885–2887) — bắt buộc một trong 4 mã (`OPPORTUNITY_LOST_REASONS`); gửi `mark_lost` ngay khi
// chọn (server từ chối các báo giá đã gửi của cơ hội, nháp giữ). "Huỷ" đóng ô, không ghi gì.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import { OPPORTUNITY_LOST_REASONS, type OpportunityLostReason } from '@appchat/shared';

const useStyles = createStyles(({ css }) => ({
  box: css`
    margin: 4px 0 12px;
    padding: 12px;
    border-radius: ${radius.r10}px;
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
  `,
  cap: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.hotText};
    margin-bottom: 8px;
  `,
  row: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  `,
  pick: css`
    height: 30px;
    padding: 0 12px;
    border: 1px solid ${color.dangerLine};
    border-radius: ${radius.pill}px;
    background: ${color.surface};
    color: ${color.hotText};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  cancel: css`
    height: 30px;
    padding: 0 12px;
    border: none;
    background: none;
    color: ${color.text3};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
  `,
}));

export function LostReasonPicker({ onPick, onCancel, busy }: { onPick: (r: OpportunityLostReason) => void; onCancel: () => void; busy?: boolean }) {
  const t = useTranslations('common.opportunity');
  const { styles } = useStyles();
  return (
    <div className={styles.box} role="group" aria-label={t('lostAsk')} data-testid="opp-lost-picker">
      <div className={styles.cap}>{t('lostAsk')}</div>
      <div className={styles.row}>
        {OPPORTUNITY_LOST_REASONS.map((r) => (
          <button key={r} type="button" className={styles.pick} disabled={busy} onClick={() => onPick(r)} data-testid={`opp-lost-${r}`}>
            {t(`lostReason.${r}`)}
          </button>
        ))}
        <button type="button" className={styles.cancel} onClick={onCancel}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
