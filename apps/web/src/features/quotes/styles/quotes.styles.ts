// Màn Báo giá — tiêu đề + tìm + 2 nút, chip trạng thái, thanh công cụ, thanh chọn nhiều, chân bảng — prototype L4958–5011.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useQuotesStyles = createStyles(({ css, responsive }) => ({
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
    width: 260px;
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
  primary: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    padding: 8px 16px;
    border-radius: ${radius.r10}px;
    cursor: pointer;
    border: none;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  aiBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    border: 1px solid ${color.violet};
    background: ${color.violetBg};
    border-radius: ${radius.r10}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.violet};
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  `,
  chips: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    ${responsive.md} {
      flex-wrap: nowrap;
      overflow-x: auto;
      max-width: 100%;
    }
  `,
  chip: css`
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  chipOn: css`
    font-weight: ${font.weight.bold};
    border-color: transparent;
    background: ${color.text};
    color: ${color.white};
  `,
  chipN: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    opacity: 0.7;
    margin-left: 4px;
  `,
  grow: css`
    flex: 1;
  `,
  tool: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.divider};
    border-radius: ${radius.r8}px;
    gap: 2px;
  `,
  segBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 0 12px;
    height: 34px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: transparent;
    color: ${color.text3};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  bulk: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  selAll: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    input {
      width: 15px;
      height: 15px;
      accent-color: ${color.brand};
      margin: 0;
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  sep: css`
    width: 1px;
    height: 18px;
    background: ${color.border};
  `,
  bulkBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 34px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bulkPrimary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-top: none;
    border-radius: 0 0 ${radius.r16}px ${radius.r16}px;
    margin-top: -12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    b {
      color: ${color.text};
    }
  `,
  pg: css`
    display: inline-flex;
    align-items: center;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    padding: 0 12px;
    height: 30px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      color: ${color.text4};
      cursor: default;
    }
  `,
  pgOn: css`
    min-width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
}));
