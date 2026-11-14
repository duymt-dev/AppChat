// Drawer chi tiết đơn hàng — prototype L5575–5588 (392px, nền xám): đầu (icon 54 · mã · trạng thái · giá trị · khách) + chân thao tác theo 2 trục.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useOrderDetailStyles = createStyles(({ css, responsive }) => ({
  body: css`
    padding: 4px 8px;
  `,
  top: css`
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
    padding-right: 32px;
  `,
  icon: css`
    width: 54px;
    height: 54px;
    border-radius: ${radius.r12}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  chips: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  code: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  st: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  value: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    margin-top: 4px;
    letter-spacing: -0.01em;
  `,
  cust: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.bg};
    border: 1px solid ${color.mutedBg};
    border-radius: ${radius.r10}px;
  `,
  av: css`
    width: 34px;
    height: 34px;
    font-size: ${font.scale.s14}px;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  phone: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  byL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: right;
  `,
  byV: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    text-align: right;
  `,
  foot: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 20px;
    border-top: 1px solid ${color.border};
    background: ${color.surface};
    flex-shrink: 0;
  `,
  act: css`
    flex: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    white-space: nowrap;
    &:disabled {
      cursor: not-allowed;
      color: ${color.text4};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  actPrimary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
  `,
  actWarn: css`
    color: ${color.amberText};
  `,
  actDanger: css`
    color: ${color.dangerDeep};
  `,
}));
