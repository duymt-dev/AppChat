// Khối dùng chung của các mục Cài đặt — prototype L5824–6276: thẻ trắng viền 12, hàng nhãn 200px + input, nút xanh / chip, bảng lưới
// (header in hoa 12 xám), menu ⋯, vùng nguy hiểm đỏ nhạt.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 38px;
  padding: 0 16px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  box-sizing: border-box;
`;
const field = `
  height: 38px;
  padding: 0 12px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  outline: none;
  background: ${color.surface};
  color: ${color.text};
  box-sizing: border-box;
`;

export const useSectionStyles = createStyles(({ css, responsive }) => ({
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 20px;
    margin-bottom: 16px;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  cardFlush: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    margin-bottom: 16px;
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  between: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  cT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  cT15: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  cS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  sm: css`
    && {
      height: auto;
      min-height: ${layout.chip}px;
      padding: 0 12px;
    }
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  dangerBtn: css`
    ${btn}
    height: auto;
    min-height: ${layout.chip}px;
    padding: 0 12px;
    border: none;
    background: ${color.dangerStrong};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
  dangerGhost: css`
    ${btn}
    height: auto;
    min-height: ${layout.chip}px;
    padding: 0 12px;
    border: 1px solid ${color.dangerStrong};
    background: transparent;
    color: ${color.dangerStrong};
    font-weight: ${font.weight.bold};
  `,
  input: css`
    ${field}
    flex: 1;
    min-width: 0;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  inputW200: css`
    && {
      flex: none;
      width: 200px;
    }
    ${responsive.md} {
      && {
        width: 100%;
      }
    }
  `,
  inputW240: css`
    && {
      flex: none;
      width: 240px;
    }
    ${responsive.md} {
      && {
        width: 100%;
      }
    }
  `,
  select: css`
    ${field}
    width: 100%;
    height: 40px;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 6px;
  `,
  search: css`
    position: relative;
    display: flex;
    align-items: center;
    flex: 1;
    max-width: 330px;
    svg {
      position: absolute;
      left: 12px;
    }
    input {
      ${field}
      width: 100%;
      padding-left: 32px;
    }
    ${responsive.md} {
      max-width: none;
      input {
        height: ${layout.touch}px;
      }
    }
  `,
  th: css`
    display: grid;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${color.text4};
    align-items: center;
    ${responsive.md} {
      display: none;
    }
  `,
  tr: css`
    display: grid;
    gap: 12px;
    padding: 12px 16px;
    align-items: center;
    border-bottom: 1px solid ${color.divider};
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  `,
  box: css`
    width: 18px;
    height: 18px;
    border: 1.5px solid ${color.lySwitchOff};
    border-radius: ${radius.r4}px;
    box-sizing: border-box;
    ${responsive.md} {
      display: none;
    }
  `,
  more: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  menu: css`
    position: absolute;
    right: 0;
    top: 32px;
    z-index: 30;
    width: 160px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.popover};
    padding: 4px;
  `,
  scrim: css`
    position: fixed;
    inset: 0;
    z-index: 29;
  `,
  mItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.divider};
    }
  `,
  mDanger: css`
    && {
      color: ${color.dangerStrong};
    }
  `,
  rel: css`
    position: relative;
    display: flex;
    justify-content: flex-end;
  `,
  foot: css`
    text-align: center;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    b {
      color: ${color.text2};
    }
  `,
  link: css`
    color: ${color.brandInk};
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    font: inherit;
  `,
}));
