// Trang chứng từ công khai `/documents/[token]` (TIP-032b P2) — không có prototype: cùng token + bố cục thẻ của trang xem báo giá công khai.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const usePublicDocumentStyles = createStyles(({ css, responsive }) => ({
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
    max-width: 560px;
    margin: 0 auto;
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 20px;
    margin-bottom: 16px;
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
    margin-top: 4px;
    word-break: break-word;
  `,
  pdf: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    padding: 0 16px;
    border-radius: ${radius.r12}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
  `,
}));
