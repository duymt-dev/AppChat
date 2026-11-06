// Mục Chia lead (TIP-042b) — prototype L7357–7363 "Quy tắc phân công": tiêu đề khối 15 đậm 800 + phụ đề 13 xám, thẻ trắng bo 12 pad 4/20,
// hàng 12/0 gạch 1px nhạt, nhãn 14 đậm 600 bên trái, điều khiển bên phải. Mỗi hàng là một rule (mặc định / ghi đè tài khoản kênh).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useRoutingStyles = createStyles(({ css, responsive }) => ({
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 4px 20px;
    margin-bottom: 20px;
    ${responsive.md} {
      padding: 4px 12px;
    }
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: 0;
    }
    ${responsive.md} {
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  lbl: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  desc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  pill: css`
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: ${radius.r6}px;
    background: ${color.bg};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    white-space: nowrap;
  `,
  on: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  legacy: css`
    background: ${color.warnBg};
    color: ${color.warn};
  `,
  note: css`
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 20px;
  `,
  pick: css`
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px 12px;
    max-height: 220px;
    overflow: auto;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  opt: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 32px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    cursor: pointer;
  `,
  seg: css`
    display: flex;
    gap: 8px;
  `,
  toggle: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
}));
