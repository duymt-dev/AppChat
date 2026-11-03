// AI soạn hợp đồng (TIP-030b F2): khung brief + đề xuất trong form tạo, khối gợi ý Giữ / Bỏ ở drawer — token theme, không hard-code.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useDraftStyles = createStyles(({ css, responsive }) => ({
  panel: css`
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.bg};
  `,
  head: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  hint: css`
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
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
  flush: css`
    margin-top: 0;
    flex-wrap: nowrap;
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
  `,
  lines: css`
    margin: 8px 0 0;
    padding: 0;
    list-style: none;
    font-size: ${font.scale.s12}px;
    li {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 4px 0;
      border-bottom: 1px solid ${color.border};
    }
  `,
  off: css`
    color: ${color.amberText};
    font-weight: ${font.weight.semibold};
  `,
  err: css`
    margin-top: 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.dangerDeep};
  `,
  sug: css`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 1px solid ${color.border};
    font-size: ${font.scale.s13}px;
  `,
  tag: css`
    display: inline-block;
    margin-right: 6px;
    padding: 0 6px;
    border-radius: ${radius.r6}px;
    background: ${color.violetBg};
    color: ${color.violet};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
  `,
  done: css`
    color: ${color.text3};
    font-size: ${font.scale.s12}px;
  `,
}));
