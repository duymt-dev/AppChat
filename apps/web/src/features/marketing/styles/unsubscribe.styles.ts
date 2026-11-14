// Trang huỷ nhận tin công khai (TIP-037) — không có prototype: cùng bố cục thẻ của trang xem báo giá / ký hợp đồng công khai.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useUnsubStyles = createStyles(({ css, responsive }) => ({
  page: css`
    min-height: 100vh;
    background: ${color.bg};
    font-family: ${font.family};
    padding: 32px 16px;
    box-sizing: border-box;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  wrap: css`
    max-width: 520px;
    margin: 0 auto;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 24px;
    box-shadow: ${shadow.card};
  `,
  biz: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  h1: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 12px;
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 8px;
  `,
  warn: css`
    margin-top: 12px;
    padding: 8px 12px;
    border-radius: ${radius.r12}px;
    background: ${color.warnSoftBg};
    color: ${color.amberText};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
  primary: css`
    margin-top: 20px;
    min-height: 44px;
    padding: 0 20px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `,
}));
