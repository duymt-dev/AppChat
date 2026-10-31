// Trang xem báo giá công khai `/q/[token]` (TIP-029, COMMERCE §3) — không có prototype: dùng token + bố cục thẻ của trang ký hợp đồng.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const usePublicQuoteStyles = createStyles(({ css, responsive }) => ({
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
    max-width: 760px;
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
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 4px;
  `,
  h1: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 12px;
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
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${font.scale.s13}px;
    th {
      text-align: left;
      color: ${color.text4};
      font-weight: ${font.weight.bold};
      padding: 8px 4px;
      border-bottom: 1px solid ${color.divider};
    }
    td {
      padding: 8px 4px;
      border-bottom: 1px solid ${color.divider};
      color: ${color.text};
      vertical-align: top;
    }
    td:last-child,
    th:last-child {
      text-align: right;
    }
    ${responsive.md} {
      font-size: ${font.scale.s12}px;
    }
  `,
  sum: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    padding: 4px 0;
  `,
  total: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    padding-top: 12px;
    margin-top: 6px;
    border-top: 1px solid ${color.divider};
  `,
  words: css`
    font-size: ${font.scale.s12}px;
    font-style: italic;
    color: ${color.text3};
    text-align: right;
  `,
  kv: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    margin-top: 6px;
  `,
  pdf: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    text-decoration: none;
  `,
}));
