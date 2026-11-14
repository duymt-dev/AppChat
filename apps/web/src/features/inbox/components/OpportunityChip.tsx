// Chip cơ hội của Hộp thư (TIP-026c §5.2) — đầu hội thoại (prototype L2064: pill 30px, chấm + "Cơ hội · {giai đoạn} · {giá trị}", màu giai
// đoạn) và dòng hội thoại (L1978: nhãn 10px tím "Cơ hội · {giá trị}"). Giá trị rút gọn kiểu prototype: "48tr", "8,5tr", "1,2 tỷ". Dữ liệu = `opportunity_chip` (tóm tắt cơ hội mở, một truy vấn cả trang);
// giai đoạn cao nhất của các cơ hội mở, giá trị = tổng; ẩn tiền theo quyền → chỉ giai đoạn. Vắng = không có cơ hội mở.
'use client';
import { useTranslations } from 'next-intl';
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import type { OpenOpportunitySummaryDto } from '@appchat/shared';
import { useFmt } from '@/shared/i18n/useFmt';
import { stageColor, stageTint } from '@/shared/opportunities';

const useStyles = createStyles(({ css }) => ({
  pill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
    margin-right: 6px;
    flex-shrink: 0;
  `,
  dot: css`
    width: 7px;
    height: 7px;
    border-radius: 50%;
  `,
  tag: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
    white-space: nowrap;
  `,
}));

export function OpportunityChip({ chip, compact }: { chip?: OpenOpportunitySummaryDto; compact?: boolean }) {
  const t = useTranslations('common.opportunity');
  const fmt = useFmt();
  const { styles } = useStyles();
  if (!chip) return null;
  const stage = t(`stage.${chip.top_stage}`);
  const n = Number(chip.amount_vnd ?? 0);
  const value = chip.amount_hidden || !n ? null : n >= 1e9 ? t('billions', { v: fmt.number(Number((n / 1e9).toFixed(2))) }) : t('millions', { v: fmt.number(Number((n / 1e6).toFixed(1))) });
  const tone = { color: stageColor(chip.top_stage), background: stageTint(chip.top_stage) };
  const label = [t('chip'), compact ? null : stage, value].filter(Boolean).join(' · ');
  const title = t('chipTitle', { n: chip.count, stage });
  if (compact)
    return (
      <span className={styles.tag} style={{ color: color.oppNewText, background: color.oppNewBg }} title={title} data-testid="conv-opp-chip">
        {value ? label : `${t('chip')} · ${stage}`}
      </span>
    );
  return (
    <span className={styles.pill} style={tone} title={title} data-testid="chat-opp-chip">
      <span className={styles.dot} style={{ background: tone.color }} />
      {label}
    </span>
  );
}
