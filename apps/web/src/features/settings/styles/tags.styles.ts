// Mục Thẻ & Câu trả lời mẫu — prototype L6031–6075: hero thẻ (icon 34 xám, tiêu đề 20), nút Tạo thẻ xanh dương 38, ô tìm 340,
// bảng 8 cột (chip màu nền 22%), nhóm câu trả lời (đầu nhóm icon lưới xanh, hàng 130 / 1fr / 60 + shortcut mono xanh).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useTagsStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 20px;
    margin-bottom: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    ${responsive.md} {
      padding: 12px;
      flex-wrap: wrap;
    }
  `,
  heroIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.wgPanel};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  heroT: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  heroS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  learn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    background: ${color.surface};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  newBlue: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: ${color.blue};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    height: 38px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  search: css`
    position: relative;
    width: 340px;
    max-width: 44%;
    display: flex;
    align-items: center;
    svg {
      position: absolute;
      left: 12px;
    }
    input {
      height: 40px;
      width: 100%;
      padding-left: 36px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r10}px;
      font-size: ${font.scale.s15}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    ${responsive.md} {
      width: 100%;
      max-width: none;
      input {
        height: ${layout.touch}px;
      }
    }
  `,
  grid: css`
    grid-template-columns: 130px 1.2fr 1fr 0.9fr 1.3fr 1.3fr 1.3fr 70px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    padding: 16px;
  `,
  thGrid: css`
    && {
      grid-template-columns: 130px 1.2fr 1fr 0.9fr 1.3fr 1.3fr 1.3fr 70px;
      font-size: ${font.scale.s13}px;
      text-transform: none;
      letter-spacing: 0;
      color: ${color.text3};
      padding: 12px 16px;
    }
  `,
  right: css`
    text-align: right;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    min-width: 26px;
    height: 24px;
    padding: 0 8px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  ell: css`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  `,
  sub: css`
    color: ${color.text3};
  `,
  faint: css`
    color: ${color.text4};
  `,
  hideM: css`
    ${responsive.md} {
      display: none !important;
    }
  `,
  fill: css`
    && {
      flex: 1;
      max-width: none;
    }
  `,
  newSm: css`
    && {
      padding: 0 12px;
    }
  `,
  group: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: visible;
    margin-bottom: 12px;
  `,
  gHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  gT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  gN: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  rRow: css`
    display: grid;
    grid-template-columns: 130px 1fr 60px;
    gap: 12px;
    padding: 12px 20px;
    align-items: center;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
    ${responsive.md} {
      grid-template-columns: 1fr ${layout.touch}px;
      padding: 8px 12px;
      code {
        grid-column: 1 / -1;
      }
    }
  `,
  sc: css`
    font-size: ${font.scale.s13}px;
    background: ${color.divider};
    padding: 2px 8px;
    border-radius: ${radius.r4}px;
    color: ${color.brandInk};
    font-weight: ${font.weight.semibold};
    font-family: ${font.mono};
    justify-self: start;
  `,
  rT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  end: css`
    display: flex;
    justify-content: flex-end;
    position: relative;
  `,
}));
