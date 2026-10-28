// Khách hàng — nút đầu trang, thanh thao tác hàng loạt — prototype L2451–2512 (< md: xếp dọc, chạm ≥ 44px).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCrmStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    padding: 24px 28px;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  search: css`
    position: relative;
    margin-right: 2px;
    ${responsive.md} {
      order: 10;
      width: 100%;
      margin: 0;
    }
  `,
  searchIcon: css`
    position: absolute;
    left: 8px;
    top: 12px;
  `,
  searchInput: css`
    height: 36px;
    width: 260px;
    padding-left: 28px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    outline: none;
    font-family: inherit;
    ${responsive.md} {
      width: 100%;
      height: ${layout.touch}px;
    }
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 6px 12px;
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    &:hover {
      background: ${color.brandBg};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  hideMd: css`
    ${responsive.md} {
      display: none;
    }
  `,
  badge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    background: ${color.dangerSoftBg};
    color: ${color.dangerDeep};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  btnp: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    line-height: 1;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  btnDark: css`
    background: ${color.text};
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  check: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    accent-color: ${color.brand};
  `,
  vsep: css`
    width: 1px;
    height: 18px;
    background: ${color.border};
  `,
  bulk: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 36px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    padding: 0 8px;
    border-radius: ${radius.r8}px;
    border: none;
    background: transparent;
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
    }
  `,
  tool: css`
    border-radius: ${radius.r6}px;
  `,
  iconTool: css`
    width: 36px;
    justify-content: center;
    padding: 0;
  `,
  newField: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
}));
