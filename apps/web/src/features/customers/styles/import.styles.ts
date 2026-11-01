// Modal "Nhập khách hàng" (REQ-F03 — prototype chỉ có nút "Nhập" L2460): khung modal + bảng xem trước theo token.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useImportStyles = createStyles(({ css, responsive }) => ({
  drop: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px 16px;
    border: 1.5px dashed ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.kanbanCol};
    text-align: center;
    color: ${color.text3};
    font-size: ${font.scale.s14}px;
  `,
  pick: css`
    min-height: ${layout.touch}px;
  `,
  map: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    align-items: center;
    margin: 12px 0;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  col: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  scroll: css`
    max-height: 220px;
    overflow: auto;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r8}px;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${font.scale.s12}px;
    th,
    td {
      padding: 6px 8px;
      border-bottom: 1px solid ${color.dividerSoft};
      text-align: left;
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      background: ${color.surface};
      color: ${color.text3};
      font-weight: ${font.weight.bold};
    }
  `,
  result: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  stat: css`
    padding: 12px;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    b {
      display: block;
      font-size: ${font.scale.s20}px;
      color: ${color.text};
    }
  `,
}));
