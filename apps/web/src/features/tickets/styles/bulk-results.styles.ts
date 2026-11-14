// Khung kết quả sửa ticket hàng loạt (TIP-034c §4.1) — dưới thanh chọn nhiều; danh sách id cuộn trong khung, mobile 390 xếp dọc.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useBulkResultStyles = createStyles(({ css, responsive }) => ({
  box: css`
    margin-bottom: 12px;
    padding: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  title: css`
    font-weight: ${font.weight.bold};
  `,
  grow: css`
    flex: 1;
  `,
  note: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  warn: css`
    font-size: ${font.scale.s13}px;
    color: ${color.warn};
  `,
  list: css`
    max-height: 168px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 0;
    padding: 0;
    list-style: none;
  `,
  row: css`
    display: flex;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  code: css`
    font-weight: ${font.weight.semibold};
    min-width: 96px;
  `,
  bad: css`
    color: ${color.danger};
  `,
  btn: css`
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    &:disabled {
      cursor: default;
      color: ${color.text3};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
