// Lưới giờ (tuần = 7 cột ngày, ngày = cột theo KTV) — prototype L3947–3966; lưới tháng — L3970–3992.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const HOUR_PX = 64;

export const useCalGridStyles = createStyles(({ css, responsive }) => ({
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  scroll: css`
    ${responsive.md} {
      overflow-x: auto;
      > div {
        min-width: 720px;
      }
    }
  `,
  head: css`
    display: grid;
  `,
  corner: css`
    border-bottom: 1px solid ${color.divider};
    border-right: 1px solid ${color.divider};
  `,
  col: css`
    padding: 12px 8px;
    text-align: center;
    border-bottom: 1px solid ${color.divider};
    border-right: 1px solid ${color.dividerSoft};
    cursor: pointer;
    &:last-child {
      border-right: none;
    }
  `,
  dow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
  `,
  date: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    margin-top: 2px;
  `,
  staffAv: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    color: ${color.white};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    display: inline-grid;
    place-items: center;
    margin-bottom: 2px;
  `,
  body: css`
    position: relative;
  `,
  hour: css`
    display: grid;
    height: ${HOUR_PX}px;
  `,
  hourL: css`
    border-right: 1px solid ${color.divider};
    border-bottom: 1px solid ${color.dividerSoft};
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: right;
    padding: 4px 8px 0 0;
  `,
  cell: css`
    border-right: 1px solid ${color.dividerSoft};
    border-bottom: 1px solid ${color.dividerSoft};
    cursor: pointer;
    &:last-child {
      border-right: none;
    }
    &:hover {
      background: ${color.bg};
    }
  `,
  ev: css`
    position: absolute;
    border-radius: ${radius.r8}px;
    padding: 6px 8px;
    overflow: hidden;
    cursor: pointer;
    box-sizing: border-box;
  `,
  evT: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  evS: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  mHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  mTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  grow: css`
    flex: 1;
  `,
  nav: css`
    display: flex;
    gap: 4px;
  `,
  navBtn: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    background: ${color.surface};
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    padding: 0;
  `,
  mDows: css`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    div {
      padding: 8px;
      text-align: center;
      font-size: ${font.scale.s12}px;
      font-weight: ${font.weight.bold};
      color: ${color.text4};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
  `,
  mGrid: css`
    display: grid;
    grid-template-columns: repeat(7, 1fr);
  `,
  mCell: css`
    min-height: 104px;
    border-right: 1px solid ${color.dividerSoft};
    border-bottom: 1px solid ${color.dividerSoft};
    padding: 6px 8px;
    min-width: 0;
    cursor: pointer;
    ${responsive.md} {
      min-height: 64px;
      padding: 4px;
    }
  `,
  mDay: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    margin-bottom: 4px;
  `,
  mEvs: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
  `,
  mEv: css`
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: ${radius.r4}px;
    padding: 2px 4px;
    min-width: 0;
    border-left: 2px solid;
  `,
  mEvT: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
  `,
  mEvN: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  more: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
    padding-left: 4px;
  `,
}));
