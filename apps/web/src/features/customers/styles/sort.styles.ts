// Menu "Sắp xếp" (không có trong prototype — chỉ có nút L2509): popover theo khung FilterPopover của packages/ui.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useSortStyles = createStyles(({ css, responsive }) => ({
  rel: css`
    position: relative;
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 40;
  `,
  pop: css`
    position: absolute;
    right: 0;
    top: calc(100% + 6px);
    z-index: 41;
    width: 220px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.filterPop};
    padding: 6px;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: ${radius.r6}px;
    background: transparent;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    text-align: left;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  grow: css`
    flex: 1;
  `,
}));
