// Tab Trao đổi / Lịch sử / SLA + ô soạn (Ghi chú nội bộ · Trả lời khách) của drawer ticket — prototype L3328–3357.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const av = `
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: ${color.white};
  display: grid;
  place-items: center;
  font-size: ${font.scale.s12}px;
  font-weight: ${font.weight.heavy};
  flex-shrink: 0;
`;

export const useTkTabStyles = createStyles(({ css, responsive }) => ({
  thread: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  msg: css`
    display: flex;
    gap: 8px;
  `,
  mine: css`
    flex-direction: row-reverse;
  `,
  av: css`
    ${av}
  `,
  aiAv: css`
    ${av}
    background: ${gradient.ai};
  `,
  bubbleW: css`
    max-width: 80%;
  `,
  who: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-bottom: 2px;
  `,
  whoR: css`
    text-align: right;
  `,
  bubble: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    padding: 8px 12px;
    border-radius: ${radius.r12}px;
    background: ${color.divider};
    color: ${color.text};
    white-space: pre-wrap;
  `,
  out: css`
    background: ${color.brand};
    color: ${color.white};
  `,
  note: css`
    background: ${color.warnSoftBg};
    color: ${color.text};
    border: 1px dashed ${color.amberGold};
  `,
  noteTag: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.amberGold};
    margin-right: 4px;
  `,
  hist: css`
    display: flex;
    flex-direction: column;
  `,
  hRow: css`
    display: flex;
    gap: 12px;
  `,
  hRail: css`
    display: flex;
    flex-direction: column;
    align-items: center;
  `,
  hDot: css`
    width: 10px;
    height: 10px;
    border-radius: ${radius.r4}px;
    margin-top: 2px;
    flex-shrink: 0;
  `,
  hLine: css`
    width: 2px;
    flex: 1;
    background: ${color.divider};
    min-height: 24px;
  `,
  hBody: css`
    padding-bottom: 16px;
  `,
  hT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  hS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  slaRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
  `,
  slaDot: css`
    width: 8px;
    height: 8px;
    border-radius: ${radius.r4}px;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
  `,
  slaV: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
  policy: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 12px;
  `,
  comp: css`
    padding: 8px 12px;
    border-top: 1px solid ${color.border};
  `,
  modes: css`
    display: flex;
    gap: 4px;
    margin-bottom: 6px;
  `,
  mode: css`
    flex: 1;
    padding: 4px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    text-align: center;
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  modeOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInkDeep};
  `,
  box: css`
    display: flex;
    gap: 8px;
    align-items: flex-end;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 6px 8px;
    input {
      flex: 1;
      border: none;
      outline: none;
      font-size: ${font.scale.s14}px;
      font-family: inherit;
      background: transparent;
      min-height: 32px;
    }
  `,
  send: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    border: none;
    cursor: pointer;
    display: grid;
    place-items: center;
    background: ${color.brand};
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  foot: css`
    display: flex;
    gap: 8px;
    margin-top: 8px;
  `,
  act: css`
    flex: 1;
    height: 36px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  closed: css`
    flex: 1;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    display: flex;
    align-items: center;
  `,
}));
