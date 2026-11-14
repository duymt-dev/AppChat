// Mục Dữ liệu RAG — prototype L6907–6946: thanh (ô hỏi AI 380, Thư mục mới, Upload), lưới 240 / 1fr; nav bo 8 (chọn: nền xanh nhạt
// chữ xanh đậm), nhãn THƯ MỤC 11 in hoa, thẻ "AI Knowledge" gradient; bảng 2.4fr .9fr 1.1fr 1fr 1fr 64 (badge loại 38, thẻ xám 11).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const COLS = '2.4fr 0.9fr 1.1fr 1fr 1fr 64px';
const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;

export const useRagStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  search: css`
    position: relative;
    flex: 1;
    max-width: 380px;
    display: flex;
    align-items: center;
    svg {
      position: absolute;
      left: 12px;
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
      max-width: none;
      flex-basis: 100%;
      input {
        height: ${layout.touch}px;
      }
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    padding: 0 12px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    padding: 0 16px;
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grid: css`
    display: grid;
    grid-template-columns: 240px 1fr;
    gap: 16px;
    align-items: start;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  side: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  `,
  navBox: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 8px;
  `,
  nav: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    margin-bottom: 2px;
    background: transparent;
    border: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    color: ${color.text2};
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  navOn: css`
    && {
      background: ${color.brandBg};
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
    span:last-child {
      color: ${color.brandInk};
    }
  `,
  navN: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
  `,
  sep: css`
    height: 1px;
    background: ${color.lyRuleChip};
    margin: 8px 4px;
  `,
  fHead: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.text4};
    padding: 6px 12px 4px;
  `,
  folder: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    color: ${color.text2};
    background: transparent;
    border: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  folderOn: css`
    && {
      background: ${color.brandBg};
      color: ${color.brandInk};
    }
  `,
  know: css`
    background: ${gradient.wgAiBox};
    border: 1px solid ${color.wgAiLine};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  knowHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  knowIc: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r8}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
  `,
  knowT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  knowS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.fieldsHeroText};
    line-height: 1.5;
    margin-bottom: 12px;
    b {
      color: ${color.brandInk};
    }
  `,
  train: css`
    ${btn}
    width: 100%;
    justify-content: center;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: visible;
    min-width: 0;
  `,
  tHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  tT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  tS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  th: css`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 8px 20px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  row: css`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr auto;
      padding: 12px;
      & > span {
        display: none;
      }
    }
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
  `,
  badge: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  min: css`
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  tags: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
  `,
  tag: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    background: ${color.lyRuleChip};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  learned: css`
    display: inline-flex;
    align-items: center;
    gap: 2px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  size: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  muted: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  acts: css`
    display: flex;
    gap: 2px;
    justify-content: flex-end;
  `,
  dl: css`
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
      display: none;
    }
  `,
  empty: css`
    padding: 36px;
    text-align: center;
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
}));
