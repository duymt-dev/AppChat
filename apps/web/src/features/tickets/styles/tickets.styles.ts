// Màn Ticket — topbar, 5 KPI (thẻ đang lọc viền xanh), tiêu đề danh sách, thanh lọc 6 select + sắp xếp/xuất/chế độ xem, thanh chọn nhiều — prototype L4838–4890.
import { createStyles } from 'antd-style';
import { color, font, layout, listPage, radius, shadow } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
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
const chip = `
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
  white-space: nowrap;
`;

export const useTicketsStyles = createStyles(({ css, responsive }) => ({
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
    margin-bottom: 12px;
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
  `,
  grow: css`
    flex: 1;
  `,
  search: css`
    position: relative;
    input {
      height: 36px;
      width: 240px;
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
      top: 12px;
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
  kpis: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  kpi: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    min-width: 0;
  `,
  kpiOn: css`
    background: ${color.brandBg};
    border-color: ${color.brand};
  `,
  kpiIc: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  kpiL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
  `,
  kpiRow: css`
    display: flex;
    align-items: baseline;
    gap: 4px;
  `,
  kpiV: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  kpiT: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
  `,
  /** Chữ chỉ cho trình đọc màn hình (TIP-034d — dấu xu hướng có lời đọc rõ). */
  sr: css`
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  `,
  stockWrap: css`
    position: relative;
    margin: -8px 0 16px;
  `,
  stockBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  stockPanel: css`
    position: absolute;
    z-index: 5;
    top: 100%;
    left: 0;
    width: 360px;
    max-width: calc(100vw - 32px);
    margin-top: 4px;
    padding: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.popover};
    font-size: ${font.scale.s12}px;
    color: ${color.text2};
    p {
      margin: 0 0 6px;
    }
  `,
  stockList: css`
    margin: 0 0 6px;
    padding-left: 16px;
  `,
  stockNote: css`
    color: ${color.text4};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  headT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  headN: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  select: css`
    height: 36px;
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
      flex: 1 1 40%;
    }
  `,
  chip: css`
    ${chip}
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
    ${responsive.md} {
      width: 100%;
    }
  `,
  segBtn: css`
    height: 36px;
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
  bulk: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    padding: 8px 12px;
    background: ${color.brandBg};
    border: 1px solid ${color.brand};
    border-radius: ${radius.r10}px;
    flex-wrap: wrap;
  `,
  bulkN: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  bulkBtn: css`
    ${chip}
    height: 32px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bulkAi: css`
    ${btn}
    height: 32px;
    background: ${color.brand};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  bulkX: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    cursor: pointer;
    color: ${color.text3};
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
}));
