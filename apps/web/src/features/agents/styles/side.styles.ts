// Drawer phải 392px — Trợ lý AI · AI Agents (prototype L2421–2449) + lịch sử phiên bản (D29, cùng khung). < md: toàn màn.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useSideStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.veil};
    z-index: 120;
    ${responsive.md} {
      z-index: 900;
    }
  `,
  panel: css`
    position: fixed;
    top: 0;
    right: 0;
    bottom: 0;
    width: ${layout.crmDrawer}px;
    max-width: 100%;
    z-index: 121;
    background: ${color.surface};
    box-shadow: ${shadow.sidePanel};
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
    ${responsive.md} {
      z-index: 901;
      width: 100%;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid ${color.divider};
    background: ${gradient.aiSoft};
  `,
  logo: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.tealInk};
    font-weight: ${font.weight.semibold};
  `,
  x: css`
    width: 30px;
    height: 30px;
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
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  `,
  hello: css`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  `,
  bot: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  bubble: css`
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  me: css`
    align-self: flex-end;
    margin-left: auto;
    max-width: 85%;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r4}px ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    margin-bottom: 12px;
    white-space: pre-wrap;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  sug: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    cursor: pointer;
    background: ${color.surface};
    text-align: left;
    font-family: inherit;
    &:hover {
      background: ${color.rowHover};
    }
  `,
  sugHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  `,
  sugIcon: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  sugTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  sugDesc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  inputRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 6px 6px 6px 12px;
    input {
      flex: 1;
      min-width: 0;
      border: none;
      outline: none;
      font-family: inherit;
      font-size: ${font.scale.s14}px;
      color: ${color.text};
      background: transparent;
      min-height: 36px;
    }
  `,
  send: css`
    width: 34px;
    height: 34px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    &:disabled {
      background: ${color.disabled};
      cursor: default;
    }
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  full: css`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    cursor: pointer;
    padding: 2px;
    border: none;
    background: transparent;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  /* thẻ xác nhận bản nháp (D29) — cùng pattern thẻ xác nhận của Trợ lý */
  draft: css`
    border: 1px solid ${color.violetLine};
    border-radius: ${radius.r12}px;
    background: ${color.violetSoft};
    padding: 12px;
    margin-bottom: 12px;
  `,
  draftHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.violetInk};
    margin-bottom: 6px;
  `,
  draftLead: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    line-height: 1.5;
    margin-bottom: 8px;
  `,
  kv: css`
    display: grid;
    grid-template-columns: 112px 1fr;
    gap: 6px 8px;
    font-size: ${font.scale.s13}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
  `,
  k: css`
    color: ${color.text4};
  `,
  v: css`
    color: ${color.text};
    font-weight: ${font.weight.semibold};
  `,
  draftActs: css`
    display: flex;
    gap: 8px;
    margin-top: 12px;
    flex-wrap: wrap;
  `,
  primary: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  ghost: css`
    display: inline-flex;
    align-items: center;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  done: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.statusActive};
    background: ${color.doneBg};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    margin-bottom: 12px;
  `,
  ver: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  verHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  verNo: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
  `,
  verNote: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  verBy: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  cur: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.statusActive};
    background: ${color.doneBg};
    border-radius: ${radius.pill}px;
    padding: 2px 8px;
  `,
}));
