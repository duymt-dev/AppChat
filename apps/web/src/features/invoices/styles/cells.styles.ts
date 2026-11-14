// Ô bảng / thẻ mobile Đề nghị thanh toán — prototype L5248–5251 (grid 110 1.2fr 1.5fr 1fr 140 110 110).
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const useInvoiceCellStyles = createStyles(({ css }) => ({
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  cust: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    display: block;
    ${clip}
  `,
  muted: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    display: block;
    ${clip}
  `,
  value: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  status: css`
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 8px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  mRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
}));
