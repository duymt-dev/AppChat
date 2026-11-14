// Hàng cài đặt dạng danh sách — prototype L6994–7019, L6890–6900: tiêu đề nhóm 15 đậm + phụ đề 13 xám, thẻ trắng pad 4/20,
// hàng 12 viền dưới (nhãn 14 bán đậm + gợi ý 13), select / input cao 36, huy hiệu cảnh báo vàng / đỏ.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const ctl = `
  height: 36px;
  padding: 0 8px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  background: ${color.surface};
  color: ${color.text};
  box-sizing: border-box;
`;

export const useRowsStyles = createStyles(({ css, responsive }) => ({
  h: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  hOnly: css`
    margin-bottom: 8px;
  `,
  hs: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 4px 20px;
    margin-bottom: 20px;
    ${responsive.md} {
      padding: 4px 12px;
    }
  `,
  cardPad: css`
    padding: 16px 20px;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
    ${responsive.md} {
      gap: 12px;
      flex-wrap: wrap;
    }
  `,
  rowTop: css`
    border-bottom: none;
    border-top: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  l: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  lMed: css`
    font-weight: ${font.weight.medium};
  `,
  d: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  select: css`
    ${ctl}
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  input: css`
    ${ctl}
    width: 120px;
    padding: 0 12px;
    outline: none;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  right: css`
    text-align: right;
  `,
  unit: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  pair: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  warn: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.govWarnText};
    background: ${color.amberBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    margin-left: 4px;
  `,
  risk: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.govRiskText};
    background: ${color.dangerBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    margin-left: 4px;
  `,
}));
