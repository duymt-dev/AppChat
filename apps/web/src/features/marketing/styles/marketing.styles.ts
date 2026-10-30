// Màn Marketing — topbar, tab kênh, hero theo kênh, 4 KPI, tab trạng thái, hàng lọc, phân trang — prototype L3394–3533.
import { createStyles } from 'antd-style';
import { color, font, layout, listPage, radius } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border-radius: ${radius.r8}px;
  font-weight: ${font.weight.bold};
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;
const field = `
  height: 36px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  background: ${color.surface};
  color: ${color.text};
  padding: 0 8px;
  outline: none;
`;

export const useMarketingStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    ${listPage(responsive.md)}
    padding: 16px 20px;
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
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
  `,
  dark: css`
    ${btn}
    padding: 0 16px;
    border: none;
    background: ${color.text};
    color: ${color.white};
    ${responsive.md} {
      height: ${layout.touch}px;
      order: 3;
    }
  `,
  outline: css`
    ${btn}
    padding: 0 12px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
      order: 3;
    }
  `,
  chans: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  `,
  chan: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    font-family: inherit;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  chanOn: css`
    font-weight: ${font.weight.bold};
    border-color: transparent;
    color: ${color.white};
  `,
  kpis: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  kpi: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    min-width: 0;
  `,
  kpiH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  kpiIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  kpiV: css`
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1.15;
  `,
  kpiT: css`
    font-size: ${font.scale.s12}px;
    color: ${color.okStrong};
    font-weight: ${font.weight.semibold};
    margin-top: 4px;
  `,
  tabs: css`
    display: flex;
    gap: 6px;
    border-bottom: 1px solid ${color.border};
    margin-bottom: 4px;
    overflow-x: auto;
  `,
  tab: css`
    padding: 8px 12px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    font-weight: ${font.weight.medium};
    color: ${color.text3};
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    font-weight: ${font.weight.bold};
    color: ${color.brand};
    border-bottom-color: ${color.brand};
  `,
  tabN: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    padding: 0 6px;
    border-radius: ${radius.pill}px;
    background: ${color.alertBg};
    color: ${color.amberText};
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 0;
  `,
  search: css`
    position: relative;
    input {
      ${field}
      width: 250px;
      padding-left: 28px;
      box-sizing: border-box;
    }
    svg {
      position: absolute;
      left: 8px;
      top: 12px;
    }
    ${responsive.md} {
      width: 100%;
      input {
        width: 100%;
        height: ${layout.touch}px;
      }
      svg {
        top: 15px;
      }
    }
  `,
  select: css`
    ${field}
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
      flex: 1;
    }
  `,
  date: css`
    ${field}
    width: 120px;
    ${responsive.md} {
      display: none;
    }
  `,
  arrow: css`
    color: ${color.text4};
    font-size: ${font.scale.s14}px;
    ${responsive.md} {
      display: none;
    }
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    height: 36px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      display: none;
    }
  `,
}));
