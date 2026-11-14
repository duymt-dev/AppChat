// Drawer "Khách đã xoá" (TIP-015f §5.3 — mở rộng chức năng ngoài prototype, theo mẫu drawer / bảng sẵn có).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useTrashStyles = createStyles(({ css, responsive }) => ({
  search: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    margin-bottom: 12px;
  `,
  searchInput: css`
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    background: transparent;
    min-width: 0;
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-bottom: 12px;
    line-height: 1.5;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.border};
  `,
  main: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  meta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  problem: css`
    font-size: ${font.scale.s12}px;
    color: ${color.dangerDeep};
    margin-top: 4px;
  `,
  pill: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    padding: 2px 8px;
    border-radius: ${radius.pill}px;
    background: ${color.pillBg};
    color: ${color.text3};
    white-space: nowrap;
  `,
  btn: css`
    border: 1px solid ${color.border};
    background: ${color.white};
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  more: css`
    margin-top: 12px;
    width: 100%;
  `,
  state: css`
    padding: 32px 0;
    text-align: center;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
}));
