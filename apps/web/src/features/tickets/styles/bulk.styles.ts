// Menu thả của thanh chọn nhiều (Gán người phụ trách ▾ / Đổi ưu tiên ▾) — cùng hình menu dòng (ActionMenu).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useBulkStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    position: relative;
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 90;
  `,
  menu: css`
    position: absolute;
    top: 36px;
    left: 0;
    z-index: 91;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.rowMenu};
    padding: 4px;
    min-width: 184px;
  `,
  item: css`
    display: flex;
    width: 100%;
    padding: 8px;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
      align-items: center;
    }
  `,
}));
