// Chọn nhiều + thanh thao tác hàng loạt của Hộp thư (TIP-025b §C.1, Q-019): ô chọn trên avatar, thanh Gán / Gắn thẻ / Đóng / Lưu trữ theo
// mẫu khách hàng, bảng kết quả từng hội thoại. Prototype không có (loại M — D21): dựng bằng token.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useBulkStyles = createStyles(({ css, responsive }) => ({
  check: css`
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    margin: 0;
    z-index: 2;
    accent-color: ${color.brand};
    cursor: pointer;
    opacity: 0;
    .conv-row:hover &,
    .conv-row:focus-within &,
    &:checked,
    &[data-mode='on'] {
      opacity: 1;
    }
    ${responsive.md} {
      width: 22px;
      height: 22px;
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.border};
    background: ${color.brandTint};
    flex-shrink: 0;
  `,
  count: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-right: auto;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  pick: css`
    height: 30px;
    max-width: 150px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 6px;
    font-size: ${font.scale.s12}px;
    font-family: inherit;
    background: ${color.surface};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  result: css`
    padding: 8px 12px;
    border-bottom: 1px solid ${color.border};
    background: ${color.bg};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex-shrink: 0;
  `,
  resultHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  fail: css`
    color: ${color.dangerStrong};
  `,
  list: css`
    max-height: 96px;
    overflow: auto;
    margin: 0;
    padding-left: 16px;
  `,
}));
