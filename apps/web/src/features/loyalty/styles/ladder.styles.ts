// Tab Tệp + tab CRM (thang hạng) của drawer thành viên — prototype L4708–4731.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const card = `
  border: 1px solid ${color.border};
  border-radius: ${radius.r12}px;
  background: ${color.surface};
  padding: 16px;
  margin-bottom: 12px;
`;

export const useLadderStyles = createStyles(({ css }) => ({
  file: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    border-top: 1px solid ${color.divider};
  `,
  ext: css`
    width: 34px;
    height: 40px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  open: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 8px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
  `,
  upload: css`
    margin: 8px 16px;
    height: 34px;
    border: 1px dashed ${color.lyDash};
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: none;
    font-family: inherit;
    width: calc(100% - 32px);
  `,
  rung: css`
    ${card}
    padding: 12px 16px;
    margin-bottom: 8px;
  `,
  rungOn: css`
    border-color: ${color.brand};
  `,
  rungH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  `,
  dot: css`
    width: 11px;
    height: 11px;
    border-radius: ${radius.r4}px;
  `,
  rungT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  cur: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  rate: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
  from: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 4px;
  `,
  perk: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.5;
  `,
}));
