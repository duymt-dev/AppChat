// Menu ⋯ tin nhắn (REQ-C09) — tách khỏi bubble.styles.ts (trần 400 dòng).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

export const useMessageMenuStyles = createStyles(({ css, responsive }) => ({
  dots: css`
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: ${color.text3};
    background: ${color.surface};
    border: 1px solid ${color.border};
    box-shadow: ${shadow.dots};
    padding: 0;
    opacity: 0;
    transition: opacity 0.14s;
    ${responsive.md} {
      opacity: 1;
      width: ${layout.touch}px;
      height: ${layout.touch}px;
      border: none;
      box-shadow: none;
      background: transparent;
    }
  `,
  dotsOn: css`
    opacity: 1;
  `,
  menu: css`
    position: absolute;
    top: 32px;
    left: 40px;
    width: 210px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.menu};
    padding: 6px;
    z-index: ${z.popover};
    text-align: left;
  `,
  menuWide: css`
    width: 232px;
  `,
  reactRow: css`
    display: flex;
    justify-content: space-between;
    padding: 4px 4px 8px;
    border-bottom: 1px solid ${color.divider};
    margin-bottom: 4px;
  `,
  reactBtn: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s18}px;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
  `,
  reactBtnOn: css`
    background: ${color.brandBg};
    box-shadow: inset 0 0 0 1.5px ${color.brand};
  `,
  menuGrow: css`
    flex: 1;
    min-width: 0;
  `,
  menuHint: css`
    font-size: ${font.scale.s11}px;
    color: ${color.placeholderSoft};
    flex-shrink: 0;
  `,
  sep: css`
    height: 1px;
    background: ${color.divider};
    margin: 4px 2px;
  `,
  translated: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.infoBg};
    color: ${color.info};
    font-size: ${font.scale.s12}px;
  `,
  menuHead: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text4};
    padding: 8px 8px 4px;
  `,
  menuItem: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    text-align: left;
    &:hover {
      background: ${color.bg};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  danger: css`
    color: ${color.danger};
  `,
}));
