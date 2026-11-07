// Bảng "Dòng sản phẩm / dịch vụ" trong drawer — prototype L5085–5108 (grid 1fr 56 96 96 32) + khối tổng.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useLineStyles = createStyles(({ css, responsive }) => ({
  head: css`
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
  `,
  add: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    height: 30px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    &:disabled {
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 56px 96px 96px 32px;
    gap: 8px;
    padding: 8px 16px;
  `,
  th: css`
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.03em;
    color: ${color.text4};
  `,
  tr: css`
    border-bottom: 1px solid ${color.dividerSoft};
    align-items: center;
  `,
  center: css`
    text-align: center;
  `,
  right: css`
    text-align: right;
  `,
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  in: css`
    height: 32px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    &:disabled {
      background: ${color.surface};
      color: ${color.text};
    }
  `,
  variant: css`
    height: 28px;
    border: 1px dashed ${color.variantDash};
    font-size: ${font.scale.s12}px;
    color: ${color.violet};
    &:disabled {
      color: ${color.violet};
    }
  `,
  top: css`
    align-self: flex-start;
  `,
  amount: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    text-align: right;
  `,
  del: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    &:disabled {
      cursor: default;
      opacity: 0.4;
    }
  `,
  sum: css`
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  sumRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  grow: css`
    flex: 1;
  `,
  v: css`
    width: 96px;
    text-align: right;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  minus: css`
    color: ${color.dangerDeep};
  `,
  pct: css`
    width: 52px;
    height: 30px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    outline: none;
    text-align: right;
  `,
  unit: css`
    color: ${color.text4};
  `,
  totalRow: css`
    display: flex;
    align-items: center;
    border-top: 1px solid ${color.divider};
    padding-top: 12px;
    margin-top: 2px;
  `,
  totalL: css`
    flex: 1;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  totalV: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  saveRow: css`
    display: flex;
    justify-content: flex-end;
    padding: 0 16px 12px;
  `,
  save: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
