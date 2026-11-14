// Drawer "Trợ lý AI · Khách hàng" + popup "AI gợi ý" — prototype L2938–2981, L888–900.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useAiStyles = createStyles(({ css, responsive }) => ({
  body: css`
    padding: 4px;
  `,
  bot: css`
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  `,
  botAv: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  botMsg: css`
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  msgs: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  user: css`
    align-self: flex-end;
    max-width: 82%;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r4}px ${radius.r12}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
  `,
  aiRow: css`
    display: flex;
    gap: 8px;
    max-width: 92%;
  `,
  aiAv: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    background: ${color.text};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  aiMsg: css`
    background: ${color.bg};
    border: 1px solid ${color.divider};
    border-radius: ${radius.r12}px ${radius.r12}px ${radius.r12}px ${radius.r4}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  act: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    height: 36px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
  `,
  section: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin: 4px 2px 8px;
  `,
  sectionGap: css`
    margin-top: 16px;
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  cmd: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    text-align: left;
    &:hover {
      background: ${color.brandBg};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  foot: css`
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  ask: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 8px 8px 8px 12px;
  `,
  input: css`
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    background: transparent;
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
  `,
  // popup "AI gợi ý"
  peekVeil: css`
    position: fixed;
    inset: 0;
    z-index: 1500;
    background: ${color.peekVeil};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
  `,
  peek: css`
    width: 420px;
    max-width: 100%;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.peek};
    overflow: hidden;
    font-family: ${font.family};
  `,
  peekHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: ${gradient.peekHead};
    border-bottom: 1px solid ${color.violetLine};
  `,
  peekIcon: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
  `,
  peekTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  peekSub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  peekList: css`
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  peekItem: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.5;
  `,
  peekFoot: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 16px;
    border-top: 1px solid ${color.divider};
    background: ${color.bg};
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
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
}));
