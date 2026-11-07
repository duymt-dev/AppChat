// Tab "Danh sách khách hàng" của chi tiết chiến dịch — prototype L3816–3846: 5 thẻ số, lọc + pill, bảng người nhận (32 1.5fr 1.1fr .9fr 1.1fr 1.1fr 1.1fr 64).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const GRID = '32px minmax(0,1.5fr) 1.1fr 0.9fr 1.1fr 1.1fr 1.1fr 64px';
const sel = `
  height: 36px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  background: ${color.surface};
  padding: 0 12px;
  color: ${color.text2};
`;

export const useRecStyles = createStyles(({ css, responsive }) => ({
  stats: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  stat: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
  `,
  statH: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  statIc: css`
    width: 24px;
    height: 24px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
  `,
  statV: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1.1;
  `,
  statS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    margin-top: 2px;
  `,
  filters: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  sel: css`
    ${sel}
    ${responsive.md} {
      display: none;
    }
  `,
  search: css`
    position: relative;
    flex: 1;
    min-width: 200px;
    svg {
      position: absolute;
      left: 12px;
      top: 12px;
    }
    input {
      ${sel}
      width: 100%;
      padding-left: 32px;
      outline: none;
      box-sizing: border-box;
    }
    ${responsive.md} {
      input {
        height: ${layout.touch}px;
      }
      svg {
        top: 15px;
      }
    }
  `,
  pills: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  pill: css`
    padding: 6px 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
  `,
  pillOn: css`
    font-weight: ${font.weight.bold};
    border-color: transparent;
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  listH: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  `,
  listT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: auto;
  `,
  thead: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 8px 16px;
    border-bottom: 1px solid ${color.border};
    background: ${color.tabIdle};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${color.text4};
    min-width: 860px;
  `,
  row: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
    min-width: 860px;
    input {
      width: 15px;
      height: 15px;
      accent-color: ${color.brand};
    }
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  av: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  rn: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  ph: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    font-family: ${font.mono};
  `,
  rst: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    white-space: nowrap;
  `,
  t1: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  t2: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  acts: css`
    display: flex;
    gap: 2px;
    justify-content: flex-end;
    button {
      width: 28px;
      height: 28px;
      border-radius: ${radius.r6}px;
      display: grid;
      place-items: center;
      cursor: pointer;
      border: none;
      background: none;
      padding: 0;
    }
  `,
  empty: css`
    padding: 32px 16px;
    text-align: center;
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
  `,
}));
