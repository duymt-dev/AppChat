// Modal thêm / sửa sản phẩm (560px) — prototype L4069–4160: lưới 2 cột ô 38px, khối theo loại, thuộc tính, biến thể.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useProductFormStyles = createStyles(({ css, responsive }) => ({
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    font-weight: ${font.weight.regular};
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  head: css`
    padding: 16px 20px;
  `,
  wide: css`
    grid-column: 1 / -1;
  `,
  check: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    min-height: 36px;
    accent-color: ${color.brand};
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  label: css`
    display: block;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  input: css`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    box-sizing: border-box;
    outline: none;
    color: ${color.text};
    background: ${color.surface};
    &:focus {
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  inputSm: css`
    height: 36px;
    font-size: ${font.scale.s13}px;
  `,
  select: css`
    padding: 0 8px;
    cursor: pointer;
  `,
  hint: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    margin-top: 4px;
    line-height: 1.4;
  `,
  catRow: css`
    display: flex;
    gap: 6px;
  `,
  plus: css`
    width: 38px;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.brandInk};
    flex-shrink: 0;
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.bold};
    background: ${color.surface};
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  newCat: css`
    display: flex;
    gap: 6px;
    margin-top: 6px;
  `,
  newCatInput: css`
    border-color: ${color.brand};
    height: 34px;
    font-size: ${font.scale.s13}px;
  `,
  newCatBtn: css`
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    flex-shrink: 0;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  blocks: css`
    padding: 0 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    ${responsive.md} {
      padding: 0 16px 16px;
    }
  `,
  secHead: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    gap: 8px;
  `,
  secTitle: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  secHint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
  `,
  grow: css`
    flex: 1;
  `,
  link: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  three: css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  rows: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  row: css`
    display: flex;
    gap: 8px;
    align-items: center;
  `,
  qty: css`
    width: 70px;
    flex-shrink: 0;
  `,
  attrName: css`
    width: 150px;
    flex-shrink: 0;
    ${responsive.md} {
      width: 110px;
    }
  `,
  del: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.dangerDeep};
    flex-shrink: 0;
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  cfGrid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  cfEmpty: css`
    border: 1px dashed ${color.dotIdle};
    border-radius: ${radius.r10}px;
    padding: 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    line-height: 1.5;
    b {
      color: ${color.brandInk};
    }
  `,
  vTable: css`
    border: 1px solid ${color.tagLine};
    border-radius: ${radius.r10}px;
    overflow: hidden;
  `,
  vHead: css`
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 0.8fr;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.rowHover};
    border-bottom: 1px solid ${color.pillBg};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  vRow: css`
    display: grid;
    grid-template-columns: 1.4fr 1fr 1fr 0.8fr;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.logLine};
    align-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    input {
      height: 32px;
      padding: 0 8px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r6}px;
      font-size: ${font.scale.s12}px;
      font-family: inherit;
      outline: none;
      box-sizing: border-box;
      min-width: 0;
    }
  `,
  err: css`
    margin: 0 20px 12px;
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
  `,
  foot: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,
  cancel: css`
    display: inline-flex;
    align-items: center;
    min-height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  save: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: ${layout.chip}px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
