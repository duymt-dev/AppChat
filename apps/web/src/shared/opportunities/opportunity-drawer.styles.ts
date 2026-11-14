// Drawer "Cơ hội · Sales Pipeline 360°" (TIP-026c §5.1) — prototype L2852–2915: hộp 980 nền xám, đầu trắng (nhãn 12px, tên 18px, 3 nút
// 32px), thân lưới 1.35fr / 1fr, thẻ trắng 12px; chuỗi chứng từ chấm 26px; ô lý do Thua nền đỏ nhạt. Mobile 390: toàn màn (một cột).
import { createStyles } from 'antd-style';
import { color, font, radius, shadow, z } from '@appchat/ui';

const btn = `height: 32px; padding: 0 12px; border-radius: ${radius.r8}px; font-size: ${font.scale.s13}px; font-weight: ${font.weight.bold}; cursor: pointer; font-family: inherit;`;

export const useDrawerStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.stackedModal};
    background: ${color.overlay};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    width: 980px;
    max-width: 100%;
    max-height: calc(100vh - 40px);
    background: ${color.bg};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.crmModal};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ${font.family};
    /* prototype L2855 không đặt line-height → normal (không phải 1.5714 của antd) */
    line-height: normal;
    ${responsive.md} {
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  head: css`
    background: ${color.surface};
    border-bottom: 1px solid ${color.border};
    padding: 16px 20px;
    flex-shrink: 0;
    position: relative;
  `,
  x: css`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    border: none;
    background: none;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    display: grid;
    place-items: center;
    ${responsive.md} {
      width: 44px;
      height: 44px;
    }
  `,
  kicker: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.text3};
    margin-bottom: 6px;
    text-transform: uppercase;
  `,
  titleRow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding-right: 28px;
  `,
  name: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.pill}px;
    white-space: nowrap;
  `,
  headBtns: css`
    display: flex;
    gap: 6px;
    margin-top: 12px;
    & > button {
      flex: 1;
    }
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  primary: css`
    ${btn}
    border: none;
    background: ${color.brand};
    color: ${color.white};
    &:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 20px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1.35fr 1fr;
    gap: 12px;
    align-items: start;
    & > div {
      min-width: 0;
    }
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    margin-bottom: 12px;
  `,
  cardTight: css`
    padding: 6px 16px;
  `,
  cap: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    color: ${color.text};
    margin-bottom: 8px;
    text-transform: uppercase;
  `,
  capTight: css`
    margin: 8px 0 2px;
  `,
  lostBox: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.dangerSoftBg};
    color: ${color.hotText};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
  `,
  spacer: css`
    flex: 1;
  `,
  danger: css`
    ${btn}
    height: 30px;
    padding: 0 8px;
    border: 1px solid ${color.dangerLine};
    background: ${color.surface};
    color: ${color.hotText};
  `,
  stats: css`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  `,
  stats2: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  `,
  statL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  statV: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    & span {
      font-size: ${font.scale.s12}px;
      color: ${color.text3};
      font-weight: ${font.weight.semibold};
    }
  `,
  violet: css`
    && {
      color: ${color.violet};
    }
  `,
  green: css`
    && {
      color: ${color.brandInk};
    }
  `,
  meta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 8px;
    & b {
      color: ${color.text};
    }
  `,
  loseBtn: css`
    width: 100%;
    height: 38px;
    border: 1px solid ${color.dangerLine};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.hotText};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
  `,
  debt: css`
    margin-top: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  debtWarn: css`
    color: ${color.amberText};
  `,
  debtOk: css`
    color: ${color.statusActive};
  `,
  otherCap: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin: 12px 0 6px;
  `,
  other: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    margin-bottom: 6px;
    text-align: left;
  `,
  otherName: css`
    flex: 1;
    min-width: 0;
    & div:first-child {
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.bold};
      color: ${color.text};
    }
    & div + div {
      font-size: ${font.scale.s12}px;
      color: ${color.text3};
    }
  `,
  histRow: css`
    display: flex;
    gap: 8px;
    padding: 6px 0;
  `,
  histDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${color.brand};
    margin-top: 6px;
    flex-shrink: 0;
  `,
  histT: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
  histD: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  state: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    padding: 24px 0;
    text-align: center;
  `,
}));
