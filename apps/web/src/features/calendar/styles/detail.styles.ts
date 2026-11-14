// Drawer chi tiết lịch hẹn — prototype L4187–4231 (392px nền trắng): đầu (trạng thái, dịch vụ, giờ), khách, KTV, lưới dịch vụ, ghi chú, lịch sử, tự động hoá, chân.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const sec = `
  font-size: ${font.scale.s12}px;
  font-weight: ${font.weight.heavy};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${color.text4};
`;

export const useCalDetailStyles = createStyles(({ css, responsive }) => ({
  head: css`
    margin: 6px -4px -8px;
    padding-right: 28px;
  `,
  stRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  st: css`
    display: inline-flex;
    align-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
  `,
  svc: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  `,
  dot: css`
    width: 8px;
    height: 8px;
    border-radius: ${radius.r4}px;
  `,
  svcN: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  time: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  body: css`
    padding: 12px 4px;
  `,
  sec: css`
    ${sec}
    margin-bottom: 8px;
  `,
  secRow: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    span:first-child {
      ${sec}
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  link: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
  `,
  cust: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
  `,
  custAv: css`
    width: 42px;
    height: 42px;
    border-radius: 50%;
    background: ${color.brandDeep};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  custN: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  phone: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-family: ${font.mono};
  `,
  iconBtn: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    cursor: pointer;
    background: ${color.surface};
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  staff: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  `,
  staffAv: css`
    width: 34px;
    height: 34px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  staffN: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  staffR: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px;
    background: ${color.border};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    overflow: hidden;
    margin-bottom: 16px;
    > div {
      background: ${color.surface};
      padding: 12px;
    }
  `,
  gL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-transform: uppercase;
    letter-spacing: 0.04em;
  `,
  gV: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-top: 2px;
  `,
  note: css`
    background: ${color.noticeBg};
    border: 1px solid ${color.noticeLine};
    border-radius: ${radius.r10}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.noticeText};
    margin-bottom: 16px;
  `,
  pkg: css`
    background: ${color.aiPeekBg};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.violet};
    font-weight: ${font.weight.semibold};
    margin-top: 16px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  hist: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    span:first-child {
      color: ${color.text4};
      width: 74px;
      flex-shrink: 0;
    }
    span:nth-child(2) {
      flex: 1;
      color: ${color.text2};
    }
  `,
  tag: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.brandBg};
    padding: 2px 6px;
    border-radius: ${radius.r8}px;
  `,
  auto: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  autoDot: css`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    display: flex;
    gap: 8px;
    background: ${color.surface};
  `,
  act: css`
    flex: 1;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    height: 38px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  footWrap: css`
    flex-wrap: wrap;
  `,
  reHint: css`
    flex-basis: 100%;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  actPrimary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
  more: css`
    flex: 0 0 38px;
    padding: 0;
    ${responsive.md} {
      flex-basis: ${layout.touch}px;
    }
  `,
}));
