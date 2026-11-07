// Trợ lý AI — khung trang, thanh trên, màn chào, luồng hội thoại — prototype L1178–1311.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useAssistantStyles = createStyles(({ css, responsive }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    position: relative;
    background: ${gradient.asstPage};
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-bottom: 1px solid ${color.border};
    background: ${color.asstTopBar};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 8px 12px;
      flex-wrap: wrap;
    }
  `,
  topMark: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r8}px;
    background: ${gradient.upgrade};
    display: grid;
    place-items: center;
  `,
  topTitle: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
  `,
  brand: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.tealInk};
    background: ${color.tealBadgeBg};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
  `,
  crumb: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-left: 20px;
    ${responsive.md} {
      display: none;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  newChat: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 6px 12px;
    min-height: ${layout.chip}px;
    cursor: pointer;
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  welcome: css`
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 28px 24px;
    text-align: center;
    ${responsive.md} {
      padding: 20px 12px;
    }
  `,
  face: css`
    width: 96px;
    height: 96px;
    filter: ${shadow.welcomeFace};
    ${responsive.md} {
      width: 72px;
      height: 72px;
    }
  `,
  hello: css`
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.heavy};
    margin-top: 16px;
    ${responsive.md} {
      font-size: ${font.scale.s22}px;
    }
  `,
  ask: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    margin-top: 4px;
    ${responsive.md} {
      font-size: ${font.scale.s18}px;
    }
  `,
  composerWrap: css`
    width: 100%;
    max-width: ${layout.composer}px;
    margin: 24px auto 0;
  `,
  /** Khối thẻ rộng 160% cột composer (prototype: margin 0 -30%). */
  wide: css`
    width: 160%;
    margin: 0 -30%;
    ${responsive.md} {
      width: 100%;
      margin: 0;
    }
  `,
  eyebrow: css`
    text-align: left;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 12px;
  `,
  eyebrowTop: css`
    margin-top: 20px;
  `,
  dots: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-right: 8px;
    /* < md: chấm trang quá nhỏ để chạm — chuyển trang bằng nút "Tiếp" 44px */
    ${responsive.md} {
      display: none;
    }
  `,
  dot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    cursor: pointer;
    background: ${color.dotIdle};
    border: none;
    padding: 0;
    transition: width 0.2s;
  `,
  next: css`
    display: grid;
    place-items: center;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid ${color.border};
    background: ${color.surface};
    cursor: pointer;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  cards: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
  `,
  card: css`
    cursor: pointer;
    border-radius: ${radius.r16}px;
    padding: 16px;
    border: 1.5px solid ${color.cardLine};
    display: flex;
    flex-direction: column;
    text-align: left;
    font-family: inherit;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  cardIcon: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  cardSt: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
    flex-shrink: 0;
    margin-left: auto;
  `,
  cardTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    margin-bottom: 4px;
  `,
  cardDesc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    line-height: 1.45;
    min-height: 52px;
  `,
  cardTag: css`
    margin-top: 8px;
    display: inline-flex;
    align-self: flex-start;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
  `,
  suggest: css`
    width: 100%;
    max-width: ${layout.composer}px;
    margin: 20px auto 0;
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  prompt: css`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r10}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    font-family: inherit;
    text-align: left;
    min-height: ${layout.chip}px;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  toast: css`
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 200;
    background: ${color.text};
    color: ${color.white};
    border-radius: ${radius.r10}px;
    padding: 8px 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    box-shadow: ${shadow.toast};
    display: flex;
    align-items: center;
    gap: 8px;
  `,
}));
