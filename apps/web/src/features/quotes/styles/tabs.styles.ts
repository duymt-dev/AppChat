// Nội dung 4 tab drawer báo giá — prototype L5056–5160: thẻ trắng, vòng khả năng chốt, bảng dòng, tổng, ghi chú, timeline, trao đổi.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useQuoteTabStyles = createStyles(({ css, responsive }) => ({
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
  `,
  cardPad: css`
    padding: 12px 16px;
    margin-bottom: 16px;
  `,
  flush: css`
    padding: 0;
    overflow: hidden;
    margin-bottom: 16px;
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  gap12: css`
    margin-bottom: 12px;
  `,
  custRow: css`
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
  `,
  hMuted: css`
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  hSub: css`
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    text-transform: none;
    letter-spacing: 0;
  `,
  t13: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    margin-bottom: 8px;
  `,
  pill: css`
    margin-left: auto;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r20}px;
    padding: 2px 8px;
  `,
  hint: css`
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    b {
      color: ${color.brandInk};
    }
  `,
  spark: css`
    font-size: ${font.scale.s15}px;
    flex-shrink: 0;
    color: ${color.brandInk};
  `,
  muted: css`
    color: ${color.text3};
  `,
  ringRow: css`
    display: flex;
    gap: 16px;
    align-items: center;
  `,
  ring: css`
    flex-shrink: 0;
    width: 78px;
    height: 78px;
    border-radius: 50%;
    display: grid;
    place-items: center;
  `,
  ringIn: css`
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: ${color.surface};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  bullets: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 12px;
    flex: 1;
    min-width: 0;
  `,
  bL: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    text-transform: uppercase;
    letter-spacing: 0.03em;
  `,
  bV: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  kv: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2px 12px;
    border-top: 1px solid ${color.divider};
    padding-top: 8px;
    font-size: ${font.scale.s13}px;
    span {
      color: ${color.text4};
    }
    b {
      color: ${color.text};
      font-weight: ${font.weight.semibold};
    }
    div {
      padding: 4px 0;
    }
  `,
  full: css`
    grid-column: 1 / 3;
  `,
  warn: css`
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${color.warnSoftBg};
    border: 1px solid ${color.noticeLine};
    border-radius: ${radius.r10}px;
    padding: 12px;
    margin-bottom: 16px;
    font-size: ${font.scale.s14}px;
    color: ${color.pendingText};
  `,
  warnBtn: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid ${color.amberGold};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.pendingText};
    cursor: pointer;
    background: ${color.surface};
    white-space: nowrap;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  textarea: css`
    width: 100%;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
  `,
  link: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    margin-left: auto;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
  `,
  tl: css`
    display: flex;
    gap: 8px;
    padding-bottom: 12px;
  `,
  tlIc: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  tlDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
  `,
  tlT: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    line-height: 1.4;
  `,
  tlB: css`
    font-weight: ${font.weight.semibold};
  `,
  tlM: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  todo: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid ${color.divider};
    font-size: ${font.scale.s14}px;
  `,
  verBtn: css`
    width: 100%;
    background: none;
    border: none;
    border-top: 1px solid ${color.divider};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  box: css`
    width: 16px;
    height: 16px;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    border: 2px solid ${color.border};
  `,
  boxOn: css`
    background: ${color.brand};
    border: none;
  `,
  todoT: css`
    flex: 1;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  done: css`
    color: ${color.text4};
    text-decoration: line-through;
  `,
  when: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
  `,
  stats: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  `,
  statL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
  `,
  statV: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    margin-top: 2px;
  `,
  row: css`
    display: flex;
    gap: 8px;
    margin-bottom: 8px;
  `,
  note: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  aiBox: css`
    background: ${color.violetSoft};
    border: 1px solid ${color.aiResultLine};
  `,
  aiH: css`
    color: ${color.violetInk};
    letter-spacing: 0.05em;
  `,
  body: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    line-height: 1.55;
  `,
  follow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    background: ${color.warnSoftBg};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
  `,
}));
