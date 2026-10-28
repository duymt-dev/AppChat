// Màn Sản phẩm — tiêu đề + tìm + nút, nguồn đồng bộ, chip danh mục, ô bảng, thẻ kanban — prototype L5624–5689.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useProductsStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    padding: 24px 28px;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  search: css`
    position: relative;
    width: 240px;
    input {
      height: 38px;
      width: 100%;
      padding-left: 32px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
      color: ${color.text};
    }
    svg {
      position: absolute;
      left: 12px;
      top: 12px;
    }
    ${responsive.md} {
      width: 100%;
      order: 3;
      input {
        height: ${layout.touch}px;
      }
      svg {
        top: 15px;
      }
    }
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    height: 38px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    border: none;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  sources: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    margin-bottom: 16px;
  `,
  srcHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  srcTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  srcSub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  srcList: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  src: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r20}px;
    padding: 6px 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
  `,
  srcDot: css`
    width: 9px;
    height: 9px;
    border-radius: 50%;
  `,
  srcAt: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.medium};
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  `,
  cats: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  `,
  cat: css`
    padding: 6px 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  catOn: css`
    font-weight: ${font.weight.bold};
    border-color: transparent;
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  grow: css`
    flex: 1;
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.pillBg};
    border-radius: ${radius.r8}px;
    gap: 2px;
  `,
  segBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${radius.r6}px;
    border: none;
    background: transparent;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    font-weight: ${font.weight.bold};
  `,
}));
