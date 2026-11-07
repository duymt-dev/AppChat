// Mục Trường dữ liệu — prototype L7100–7120: banner gradient xanh viền nhạt, tab module 36 (chọn: viền xanh nền xanh nhạt), ô tìm 340,
// bảng 42 / 1.6fr / 1.2fr / 88 / 2fr / 1fr / 40 (header in hoa nền xám nhạt), huy hiệu HỆ THỐNG / AI / ĐK, chip nơi hiển thị 10px.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const GRID = '42px minmax(150px,1.6fr) minmax(120px,1.2fr) 88px minmax(220px,2fr) minmax(120px,1fr) 40px';
const badge = `
  font-size: ${font.scale.s10}px;
  font-weight: ${font.weight.bold};
  border-radius: ${radius.r4}px;
  padding: 2px 6px;
`;

export const useFieldsStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    background: ${gradient.fieldsHero};
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 16px;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  `,
  heroIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  heroT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  heroS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.fieldsHeroText};
    line-height: 1.55;
    margin-top: 2px;
    max-width: 760px;
  `,
  tabs: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: nowrap;
      overflow-x: auto;
    }
  `,
  tab: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    font-family: inherit;
    white-space: nowrap;
    flex-shrink: 0;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    && {
      font-weight: ${font.weight.bold};
      border-color: ${color.brand};
      background: ${color.brandBg};
      color: ${color.brandInk};
    }
  `,
  cnt: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    opacity: 0.7;
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  search: css`
    && {
      flex: 1;
      min-width: 200px;
      max-width: 340px;
      input {
        height: 36px;
      }
    }
    ${responsive.md} {
      && {
        max-width: none;
        input {
          height: ${layout.touch}px;
        }
      }
    }
  `,
  add: css`
    && {
      height: 36px;
      padding: 0 12px;
    }
    ${responsive.md} {
      && {
        height: ${layout.touch}px;
      }
    }
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
  `,
  th: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 12px 20px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid ${color.divider};
    background: ${color.rowHover};
    border-radius: ${radius.r12}px ${radius.r12}px 0 0;
    ${responsive.md} {
      display: none;
    }
  `,
  row: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 12px 20px;
    align-items: center;
    border-bottom: 1px solid ${color.dividerSoft};
    ${responsive.md} {
      grid-template-columns: 28px 1fr ${layout.touch}px;
      padding: 8px 12px;
      & > :nth-child(3) {
        grid-column: 2 / 3;
      }
    }
  `,
  hideM: css`
    ${responsive.md} {
      display: none !important;
    }
  `,
  ord: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  nameCell: css`
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex-wrap: wrap;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  bSys: css`
    ${badge}
    color: ${color.text3};
    background: ${color.divider};
  `,
  bAi: css`
    ${badge}
    color: ${color.white};
    background: ${gradient.ai};
  `,
  bCond: css`
    ${badge}
    color: ${color.amberText};
    background: ${color.amberBg};
  `,
  type: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-family: ${font.mono};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  req: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.dangerStrong};
    background: ${color.dangerBg};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  places: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  pOn: css`
    ${badge}
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  pOff: css`
    ${badge}
    background: ${color.divider};
    color: ${color.fieldsOff};
  `,
  roles: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    span {
      color: ${color.text4};
    }
    b {
      font-weight: ${font.weight.semibold};
    }
  `,
  empty: css`
    padding: 36px;
    text-align: center;
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
}));
