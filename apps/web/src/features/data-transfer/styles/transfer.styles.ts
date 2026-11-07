// TransferPanel (TIP-038b P4 — prototype không có màn nhập riêng, PD-023): khung ModalShell + vùng thả tệp, lưới ánh xạ, thẻ đếm, bảng
// xem trước theo token (cùng nhịp với modal Nhập khách hàng — import.styles).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useTransferStyles = createStyles(({ css, responsive }) => ({
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  input: css`
    width: 100%;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    background: ${color.surface};
    outline: none;
    &:focus {
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    background: ${color.surface};
    cursor: pointer;
    white-space: nowrap;
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:hover:not(:disabled) {
      background: ${color.brandHover};
    }
  `,
  sectionTitle: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin: 4px 0 8px;
  `,
  err: css`
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    margin-bottom: 12px;
  `,
  drop: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px 16px;
    border: 1.5px dashed ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.kanbanCol};
    text-align: center;
    color: ${color.text3};
    font-size: ${font.scale.s14}px;
  `,
  touch: css`
    min-height: ${layout.chip}px;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  entity: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 16px;
  `,
  pill: css`
    min-height: ${layout.chip}px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    font: inherit;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    cursor: pointer;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  pillOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandDeep};
    font-weight: ${font.weight.bold};
  `,
  file: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    margin-bottom: 12px;
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  stat: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 12px;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    b {
      font-size: ${font.scale.s18}px;
      color: ${color.text};
    }
  `,
  statBad: css`
    b {
      color: ${color.hotText};
    }
  `,
  map: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px 12px;
    align-items: center;
    margin: 8px 0 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  req: css`
    color: ${color.danger};
    margin-left: 2px;
  `,
  tabs: css`
    display: flex;
    gap: 4px;
    margin-bottom: 8px;
  `,
  scroll: css`
    max-height: 240px;
    overflow: auto;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r8}px;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${font.scale.s12}px;
    th,
    td {
      padding: 6px 8px;
      border-bottom: 1px solid ${color.dividerSoft};
      text-align: left;
      white-space: nowrap;
    }
    th {
      position: sticky;
      top: 0;
      background: ${color.surface};
      color: ${color.text3};
      font-weight: ${font.weight.bold};
    }
  `,
  bad: css`
    color: ${color.hotText};
  `,
  muted: css`
    color: ${color.text4};
  `,
  policy: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  note: css`
    margin-top: 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
}));
