// Tab Phụ lục + form + duyệt ký phụ lục (TIP-030b F3 — prototype không có màn, bố cục tối thiểu theo khung thẻ / nút của drawer hợp đồng,
// gap-filling §2). Token theme, không hard-code.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useAppendixStyles = createStyles(({ css, responsive }) => ({
  item: css`
    padding: 12px 0;
    border-top: 1px solid ${color.border};
    &:first-of-type {
      border-top: 0;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  code: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  meta: css`
    margin-top: 2px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    overflow-wrap: anywhere;
  `,
  pill: css`
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
  `,
  row: css`
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
  `,
  btn: css`
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    min-height: 32px;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
  `,
  empty: css`
    padding: 8px 0;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  trail: css`
    margin-top: 6px;
    font-size: ${font.scale.s11}px;
    color: ${color.text3};
  `,
  field: css`
    display: block;
    margin-top: 12px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
  `,
  input: css`
    width: 100%;
    margin-top: 4px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    background: ${color.surface};
  `,
  area: css`
    min-height: 120px;
    resize: vertical;
  `,
  pre: css`
    white-space: pre-wrap;
    padding-left: 0;
    overflow-wrap: anywhere;
  `,
}));
