// Bước nguồn hợp đồng + bảng đề xuất giá trị + tab Tệp (TIP-030b) — token theme, không hard-code màu / px ngoài thang.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useSourceStyles = createStyles(({ css, responsive }) => ({
  panel: css`
    margin-top: -4px;
    margin-bottom: 16px;
  `,
  line: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  link: css`
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    min-height: 28px;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  errRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${font.scale.s13}px;
    margin-top: 8px;
    th,
    td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid ${color.border};
      vertical-align: top;
    }
    th {
      color: ${color.text3};
      font-weight: ${font.weight.semibold};
    }
  `,
  src: css`
    display: block;
    margin-top: 2px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  none: css`
    color: ${color.text4};
  `,
  use: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    min-height: 28px;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  role: css`
    display: inline-block;
    margin-left: 6px;
    padding: 0 6px;
    border-radius: ${radius.r6}px;
    background: ${color.bg};
    color: ${color.text3};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
  `,
}));
