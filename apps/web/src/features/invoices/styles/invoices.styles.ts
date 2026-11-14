// Màn Đề nghị thanh toán — tiêu đề + tìm + 2 nút, 4 thẻ số liệu, bảng, chân bảng, nút "Cần đối soát" — prototype L5234–5254.
import { createStyles } from 'antd-style';
import { color, font, layout, listPage, radius } from '@appchat/ui';

const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: ${radius.r8}px;
  padding: 0 12px;
  font-size: ${font.scale.s14}px;
  cursor: pointer;
  font-family: inherit;
  white-space: nowrap;
`;

export const useInvoicesStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    ${listPage(responsive.md)}
    padding: 24px 28px;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  search: css`
    position: relative;
    width: 260px;
    input {
      height: 38px;
      width: 100%;
      padding-left: 32px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
      color: ${color.text};
    }
    svg {
      position: absolute;
      left: 12px;
      top: 12px;
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
    height: 38px;
    padding: 0 16px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    border: none;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  aiBtn: css`
    ${btn}
    height: 38px;
    border: none;
    background: ${color.text};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
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
    padding: 16px;
  `,
  statL: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  statV: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
  `,
  table: css`
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-height: 0;
    ${responsive.md} {
      display: block;
    }
    .ant-table-thead > tr > th {
      background: ${color.tabIdle};
      color: ${color.text4};
      font-weight: ${font.weight.heavy};
    }
  `,
  reconcile: css`
    ${btn}
    height: 30px;
    border: 1px solid ${color.warnSoftBg};
    background: ${color.alertBg};
    color: ${color.amberText};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s13}px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  grow: css`
    flex: 1;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-top: 1px solid ${color.divider};
    border-radius: 0 0 ${radius.r12}px ${radius.r12}px;
    margin-top: -12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    b {
      color: ${color.text};
    }
  `,
}));
