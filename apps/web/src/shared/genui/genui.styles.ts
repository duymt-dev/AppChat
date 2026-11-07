// Kiểu khối GenUI — chỉ token (packages/ui), tone ngữ nghĩa → màu token (standard §2). Mobile 390: row xếp dọc, bảng cuộn ngang trong khối.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';
import type { Tone } from '@appchat/shared';

/** Tone ngữ nghĩa → (chữ, nền) token. */
export const TONE: Record<Tone, { fg: string; bg: string }> = {
  default: { fg: color.text2, bg: color.muteBg },
  brand: { fg: color.brandInk, bg: color.brandBg },
  success: { fg: color.brandDeep, bg: color.brandBgSoft },
  warning: { fg: color.warn, bg: color.warnBg },
  danger: { fg: color.danger, bg: color.dangerBg },
  info: { fg: color.info, bg: color.infoBg },
};

export const useGenUiStyles = createStyles(({ css, responsive }) => ({
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  `,
  row: css`
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    min-width: 0;
    & > * {
      flex: 1 1 0;
      min-width: 0;
    }
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  section: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
  `,
  sectionTitle: css`
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  text: css`
    font-size: ${font.size.body}px;
    line-height: 1.55;
    color: ${color.text2};
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  `,
  stat: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    min-width: 0;
  `,
  statLabel: css`
    font-size: ${font.size.caption}px;
    color: ${color.text3};
  `,
  statValue: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    font-variant-numeric: tabular-nums;
  `,
  statCompare: css`
    font-size: ${font.size.caption}px;
    font-weight: ${font.weight.semibold};
  `,
  statGroup: css`
    display: grid;
    gap: 8px;
  `,
  tableWrap: css`
    overflow-x: auto;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
  `,
  table: css`
    width: 100%;
    border-collapse: collapse;
    font-size: ${font.size.small}px;
    th {
      text-align: left;
      padding: 8px 12px;
      background: ${color.bg};
      color: ${color.text3};
      font-weight: ${font.weight.semibold};
      white-space: nowrap;
    }
    td {
      padding: 8px 12px;
      border-top: 1px solid ${color.divider};
      color: ${color.text2};
    }
  `,
  clickRow: css`
    cursor: pointer;
    &:hover td {
      background: ${color.brandBgSoft};
    }
    &:focus-visible td {
      background: ${color.brandBgSoft};
      outline: none;
    }
  `,
  list: css`
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    & > li {
      padding: 8px 0;
      border-top: 1px solid ${color.divider};
    }
    & > li:first-of-type {
      border-top: 0;
    }
  `,
  clickItem: css`
    cursor: pointer;
    &:hover,
    &:focus-visible {
      background: ${color.brandBgSoft};
      outline: none;
    }
  `,
  listTitle: css`
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  listSub: css`
    font-size: ${font.size.caption}px;
    color: ${color.text3};
  `,
  progressHead: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.size.caption}px;
    color: ${color.text3};
  `,
  progressTrack: css`
    height: 8px;
    margin-top: 4px;
    border-radius: ${radius.pill}px;
    background: ${color.muteBg};
    overflow: hidden;
  `,
  badge: css`
    display: inline-flex;
    align-self: flex-start;
    padding: 2px 8px;
    border-radius: ${radius.pill}px;
    font-size: ${font.size.tag}px;
    font-weight: ${font.weight.bold};
  `,
  buttons: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  empty: css`
    font-size: ${font.size.caption}px;
    color: ${color.text4};
  `,
  more: css`
    align-self: flex-start;
  `,
  chartTitle: css`
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  qr: css`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
  `,
  qrImg: css`
    width: 180px;
    height: 180px;
    image-rendering: pixelated;
  `,
  qrStatus: css`
    font-size: ${font.size.small}px;
    color: ${color.text2};
    text-align: center;
  `,
}));
