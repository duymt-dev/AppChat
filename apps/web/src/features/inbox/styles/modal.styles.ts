// Modal "Kết nối kênh mới" + "Trợ lý AI thu nhỏ" của hộp thư — prototype L1509–1582.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useModalStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: absolute;
    inset: 0;
    background: ${color.modalVeil};
    z-index: 80;
    display: grid;
    place-items: center;
    padding: 20px;
    ${responsive.md} {
      position: fixed;
      padding: 0;
      z-index: 900;
    }
  `,
  veilSoft: css`
    background: ${color.modalVeilSoft};
    z-index: 90;
    padding: 24px;
  `,
  box: css`
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    width: min(900px, 100%);
    max-height: 88%;
    display: flex;
    flex-direction: column;
    box-shadow: ${shadow.inboxModal};
    overflow: hidden;
    ${responsive.md} {
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  aiBox: css`
    width: min(440px, 100%);
    max-height: 84%;
    box-shadow: ${shadow.aiModal};
  `,
  head: css`
    padding: 16px 20px;
    border-bottom: 1px solid ${color.border};
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  aiHead: css`
    padding: 12px 16px;
    gap: 8px;
    background: ${gradient.aiSoft};
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  `,
  title: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  meta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  x: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    border: none;
    background: none;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  body: css`
    display: flex;
    min-height: 0;
    flex: 1;
  `,
  side: css`
    width: 200px;
    border-right: 1px solid ${color.border};
    background: ${color.bg};
    padding: 12px 8px;
    flex-shrink: 0;
    ${responsive.md} {
      display: none;
    }
  `,
  cat: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: ${radius.r6}px;
    background: transparent;
    border: none;
    color: ${color.text3};
    font-weight: ${font.weight.medium};
    font-size: ${font.scale.s14}px;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    margin-bottom: 2px;
  `,
  catSm: css`
    padding: 6px 8px;
    margin-bottom: 0;
  `,
  sideHead: css`
    padding: 12px 8px 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
  `,
  catOn: css`
    background: ${color.surface};
    color: ${color.brandInk};
    font-weight: ${font.weight.semibold};
    box-shadow: ${shadow.tabRaise};
  `,
  catCount: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  main: css`
    flex: 1;
    padding: 16px;
    overflow-y: auto;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    text-align: left;
    cursor: pointer;
    font-family: inherit;
    min-height: ${layout.chip}px;
    &[aria-disabled='true'] {
      cursor: default;
    }
  `,
  cardTop: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  logo: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s15}px;
    flex-shrink: 0;
  `,
  name: css`
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  tag: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  cardFoot: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  flag: css`
    padding: 2px 6px;
    border-radius: ${radius.r10}px;
    font-weight: ${font.weight.semibold};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  flagSoon: css`
    background: ${color.divider};
    color: ${color.text3};
  `,
  hint: css`
    margin-top: 20px;
    padding: 12px;
    border-radius: ${radius.r10}px;
    background: ${gradient.connectHint};
    border: 1px solid ${color.brandEdge};
    display: flex;
    gap: 12px;
    align-items: center;
  `,
  hintIcon: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r10}px;
    background: ${gradient.brandSoft};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  hintTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  hintBody: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  aiScroll: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px;
    background: ${color.bg};
  `,
  bot: css`
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
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
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r4}px ${radius.r12}px ${radius.r12}px ${radius.r12}px;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
  `,
  cmds: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  sectionFirst: css`
    padding-top: 2px;
  `,
  section: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    padding: 8px 2px 4px;
  `,
  cmd: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: ${layout.chip}px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.surface};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  cmdLabel: css`
    flex: 1;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  kbd: css`
    font-family: ${font.mono};
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  aiFoot: css`
    padding: 12px;
    border-top: 1px solid ${color.border};
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  ask: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1.5px solid ${color.brand};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 8px 8px 8px 12px;
  `,
  askInput: css`
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    background: transparent;
    &::placeholder {
      color: ${color.placeholder};
    }
  `,
  askSend: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    padding: 0;
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
    background: none;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));
