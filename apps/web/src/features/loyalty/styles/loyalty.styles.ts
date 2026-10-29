// Màn Khách thân thiết — topbar, thẻ Tổng quan (5 ô), khung thẻ bảng dùng chung (thành viên · rời bỏ · quy tắc) — prototype L4412–4490.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  font-weight: ${font.weight.bold};
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;

export const useLoyaltyStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 12px;
      gap: 12px;
    }
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  title: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    ${responsive.md} {
      width: 100%;
      order: 2;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  search: css`
    position: relative;
    width: 230px;
    svg {
      position: absolute;
      left: 12px;
      top: 12px;
    }
    input {
      height: 36px;
      width: 100%;
      padding-left: 32px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
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
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    ${responsive.md} {
      height: ${layout.touch}px;
      order: 3;
    }
  `,
  dark: css`
    ${btn}
    border: none;
    background: ${color.text};
    color: ${color.white};
    ${responsive.md} {
      height: ${layout.touch}px;
      order: 3;
    }
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  cardPad: css`
    padding: 16px;
  `,
  cardT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  cardS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    b {
      color: ${color.brandInk};
    }
  `,
  cardH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    flex-wrap: wrap;
  `,
  ovGrid: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-top: 12px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  ov: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    min-width: 0;
  `,
  ovIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    margin-bottom: 8px;
  `,
  ovL: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  ovV: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    margin-top: 2px;
  `,
  ovU: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
  `,
  ovT: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.successStrong};
    margin-top: 2px;
  `,
  miniSearch: css`
    position: relative;
    svg {
      position: absolute;
      left: 8px;
      top: 8px;
    }
    input {
      height: 30px;
      width: 150px;
      padding-left: 28px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s13}px;
      outline: none;
      font-family: inherit;
    }
    ${responsive.md} {
      display: none;
    }
  `,
  select: css`
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    padding: 0 8px;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    b {
      color: ${color.text};
    }
  `,
  footMuted: css`
    background: ${color.tabIdle};
    b {
      color: ${color.brandInk};
    }
  `,
}));
