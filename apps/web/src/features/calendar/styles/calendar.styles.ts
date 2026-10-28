// Màn Lịch hẹn — topbar (tiêu đề + chip Đồng bộ Tasks + tìm + 2 nút), 5 KPI, thanh lọc + chuyển chế độ xem, banner đồng bộ — prototype L3871–3911.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  border: none;
  color: ${color.white};
  font-weight: ${font.weight.bold};
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;
const select = `
  height: 36px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  background: ${color.surface};
  color: ${color.text};
  padding: 0 8px;
  cursor: pointer;
`;

export const useCalendarStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
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
  syncChip: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    background: ${color.statusPotentialBg};
    color: ${color.paidText};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
  grow: css`
    flex: 1;
  `,
  search: css`
    position: relative;
    input {
      height: 34px;
      width: 230px;
      padding-left: 32px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    svg {
      position: absolute;
      left: 12px;
      top: 10px;
    }
    ${responsive.md} {
      order: 3;
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
  primary: css`
    ${btn}
    background: ${color.brand};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  dark: css`
    ${btn}
    background: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  kpis: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
    margin-bottom: 12px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  kpi: css`
    padding: 8px 12px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  kpiIc: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  kpiL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
    text-transform: uppercase;
    letter-spacing: 0.3px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  kpiV: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1.1;
  `,
  kpiS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
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
  select: css`
    ${select}
    ${responsive.md} {
      height: ${layout.touch}px;
      flex: 1;
    }
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.divider};
    border-radius: ${radius.r8}px;
    gap: 2px;
    ${responsive.md} {
      width: 100%;
    }
  `,
  segBtn: css`
    height: 34px;
    padding: 0 12px;
    border: none;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    display: inline-flex;
    gap: 4px;
    align-items: center;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    background: transparent;
    color: ${color.text3};
    ${responsive.md} {
      flex: 1;
      justify-content: center;
      height: ${layout.touch}px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  banner: css`
    padding: 8px 12px;
    border-radius: ${radius.r10}px;
    background: ${gradient.syncBanner};
    border: 1px solid ${color.border};
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    margin-bottom: 12px;
    b {
      color: ${color.text};
    }
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  bannerT: css`
    color: ${color.infoDeep};
    font-weight: ${font.weight.semibold};
  `,
  dot: css`
    color: ${color.text4};
  `,
  muted: css`
    color: ${color.text3};
  `,
  live: css`
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    border: 1px solid ${color.infoLine};
    color: ${color.paidText};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
}));
