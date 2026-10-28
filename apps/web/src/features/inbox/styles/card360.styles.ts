// Thẻ trong Hồ sơ 360° (AI tóm tắt / thông tin khách / hạng thành viên) — prototype L2031–2054.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius } from '@appchat/ui';

export const useCardStyles = createStyles(({ css }) => ({
  ring: css`
    position: relative;
    width: 84px;
    height: 84px;
  `,
  ringNum: css`
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  ringPct: css`
    font-size: ${font.scale.s14}px;
    margin-top: 4px;
  `,
  bullets: css`
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    flex: 1;
    min-width: 0;
    color: ${color.text};
  `,
  person: css`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 12px;
  `,
  bigAvatar: css`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s20}px;
    flex-shrink: 0;
  `,
  nameRow: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  pname: css`
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s18}px;
    color: ${color.text};
  `,
  tier: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.violet};
    background: ${color.tierBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  since: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin: 2px 0 6px;
  `,
  score: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    text-align: center;
    flex-shrink: 0;
  `,
  scoreNum: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  facts: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 16px;
    border-top: 1px solid ${color.divider};
    padding-top: 8px;
  `,
  fact: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    & > span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  loyalty: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r10}px;
    background: ${gradient.tier};
    color: ${color.white};
  `,
  loyaltyIcon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.glass3};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  loyaltyEyebrow: css`
    font-size: ${font.scale.s11}px;
    opacity: 0.85;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
  `,
  loyaltyTier: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
  `,
  points: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    line-height: 1.1;
    text-align: right;
  `,
  pointsSub: css`
    font-size: ${font.scale.s11}px;
    opacity: 0.85;
    text-align: right;
  `,
}));
