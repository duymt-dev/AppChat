// Modal "AI phân tích dữ liệu khách hàng" (1120px) — prototype L3568–3662: đang phân tích (12 tín hiệu) → bảng đề xuất 7 cột → chi tiết đề xuất.
import { createStyles, keyframes } from 'antd-style';
import { color, font, gradient, layout, radius, shadow, z } from '@appchat/ui';

const spin = keyframes`to { transform: rotate(360deg); }`;
const ghost = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border: 1px solid ${color.border};
  background: ${color.surface};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.bold};
  color: ${color.text2};
  font-family: inherit;
  cursor: pointer;
`;
const GRID = '112px 1.5fr 1.5fr 84px 2fr 110px 120px';

export const useAnalyzeStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.dimVeil};
    z-index: ${z.mkModal};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    width: 1120px;
    max-width: 100%;
    max-height: 92vh;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.crmModal};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
    background: ${gradient.aiSoft};
  `,
  hIc: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r10}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  hT: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  hS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.tealInk};
    font-weight: ${font.weight.semibold};
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  loading: css`
    padding: 36px 40px 40px;
    ${responsive.md} {
      padding: 20px 16px;
    }
  `,
  spinRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  spinner: css`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid ${color.border};
    border-top-color: ${color.brand};
    animation: ${spin} 0.8s linear infinite;
    flex-shrink: 0;
  `,
  signals: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  signal: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.divider};
    background: ${color.tabIdle};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
  `,
  sigOk: css`
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px 24px;
    ${responsive.md} {
      padding: 16px;
    }
  `,
  intro: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.6;
    margin-bottom: 16px;
    max-width: 900px;
  `,
  table: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: auto;
  `,
  thead: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 8px;
    padding: 12px 16px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    color: ${color.text4};
    text-transform: uppercase;
    min-width: 900px;
  `,
  row: css`
    display: grid;
    grid-template-columns: ${GRID};
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    cursor: pointer;
    min-width: 900px;
    &:hover {
      background: ${color.rowHover};
    }
  `,
  pri: css`
    display: inline-flex;
    align-items: center;
    white-space: nowrap;
    height: 24px;
    padding: 0 8px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
  `,
  b: css`
    font-weight: ${font.weight.bold};
  `,
  mono: css`
    font-family: ${font.mono};
    font-weight: ${font.weight.bold};
  `,
  soft: css`
    color: ${color.pillText};
  `,
  why: css`
    color: ${color.text3};
    line-height: 1.5;
  `,
  used: css`
    margin-left: 6px;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    padding: 2px 6px;
    border-radius: ${radius.r6}px;
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  actions: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 16px;
  `,
  ghost: css`
    ${ghost}
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  back: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    margin-bottom: 12px;
    border: none;
    background: none;
    padding: 0;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  pitch: css`
    border: 1px solid ${color.brandEdge};
    background: ${color.brandBg};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 16px;
  `,
  pitchH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    color: ${color.brandInk};
    text-transform: uppercase;
  `,
  pitchT: css`
    font-size: ${font.scale.s15}px;
    color: ${color.brandInkDeep};
    line-height: 1.6;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  info: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  infoH: css`
    padding: 12px 16px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text2};
  `,
  kv: css`
    display: grid;
    grid-template-columns: 150px 1fr;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s13}px;
    span:first-of-type {
      color: ${color.mkInfoKey};
      font-weight: ${font.weight.semibold};
    }
    span:last-of-type {
      color: ${color.text};
      font-weight: ${font.weight.semibold};
    }
  `,
  side: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  box2: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  boxL: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  fc: css`
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
  `,
  note: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 4px;
  `,
  tags: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 4px;
  `,
  tag: css`
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 8px;
    border-radius: ${radius.pill}px;
    background: ${color.muteBg};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.pillText};
  `,
  dFoot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-top: 20px;
    padding-top: 16px;
    border-top: 1px solid ${color.divider};
  `,
  primary: css`
    ${ghost}
    padding: 0 16px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    box-shadow: ${shadow.btnGlow};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
