// Hàng chờ "AI đã học — chờ duyệt" trong Dữ liệu RAG (TIP-043, PD-013 — prototype không có): tab trạng thái, thẻ hỏi–đáp (hỏi đậm 15,
// đáp 14 xám, 2 dòng), chip trạng thái; drawer duyệt dùng form chung (section.styles) + vùng so sánh bản đề xuất.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useRagReviewStyles = createStyles(({ css, responsive }) => ({
  tabs: css`
    display: flex;
    gap: 4px;
    padding: 8px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  tab: css`
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    background: transparent;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
  `,
  tabOn: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  item: css`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    width: 100%;
    padding: 12px 20px;
    border: none;
    border-bottom: 1px solid ${color.divider};
    background: transparent;
    text-align: left;
    font-family: inherit;
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${color.bg};
    }
    ${responsive.md} {
      padding: 12px;
    }
  `,
  body: css`
    flex: 1;
    min-width: 0;
  `,
  q: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  a: css`
    margin-top: 4px;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  meta: css`
    margin-top: 6px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  chip: css`
    flex-shrink: 0;
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    background: ${color.divider};
    color: ${color.text3};
  `,
  chipOk: css`
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  more: css`
    display: block;
    margin: 12px auto;
    height: 32px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    cursor: pointer;
  `,
  orig: css`
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    white-space: pre-wrap;
  `,
  area: css`
    width: 100%;
    min-height: 120px;
    resize: vertical;
  `,
  /** Nút chân drawer trên mobile ≥ vùng chạm (dangerGhost dùng chung chỉ cao 36). */
  touch: css`
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  err: css`
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.danger};
  `,
}));
