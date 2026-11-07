// Ô bảng chiến dịch + thẻ mobile — prototype L3485–3515 (grid 2.4fr 1.1fr 1fr 1.3fr 2.2fr 120 40).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const useMkCellStyles = createStyles(({ css }) => ({
  min0: css`
    min-width: 0;
  `,
  camp: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  `,
  tile: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  nameRow: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    ${clip}
  `,
  type: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    padding: 2px 6px;
    border-radius: ${radius.r6}px;
    flex-shrink: 0;
  `,
  desc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
    ${clip}
  `,
  ch: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  chIc: css`
    width: 20px;
    height: 20px;
    border-radius: ${radius.r6}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  chL: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  st: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
  `,
  stDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
  `,
  time: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  timeEnd: css`
    color: ${color.text4};
  `,
  perf: css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 12px;
  `,
  pL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-bottom: 2px;
  `,
  pV: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    white-space: nowrap;
  `,
  bar: css`
    margin-top: 4px;
    height: 3px;
    background: ${color.divider};
    border-radius: ${radius.r4}px;
    overflow: hidden;
    div {
      height: 100%;
      border-radius: ${radius.r4}px;
    }
  `,
  ai: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  `,
  aiT: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s12}px;
    color: ${color.aiHint};
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  round: css`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: inline-grid;
    place-items: center;
    flex-shrink: 0;
    border: none;
    cursor: pointer;
    padding: 0;
  `,
  menu: css`
    display: flex;
    justify-content: flex-end;
  `,
  end: css`
    display: block;
    text-align: right;
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  `,
  mSub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
}));
