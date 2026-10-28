// Khung hộp thư + thanh tab trên — prototype L1505–1600 (+ < md: 1 cột danh sách / chat, CSS L120–140).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

export const useInboxStyles = createStyles(({ css, responsive }) => ({
  root: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    background: ${color.surface};
    position: relative;
    font-family: ${font.family};
    line-height: normal;
  `,
  tabbar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px 0;
    background: ${color.surface};
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 4px 8px 0;
    }
  `,
  railBtn: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    cursor: pointer;
    padding: 0;
    ${responsive.md} {
      display: none;
    }
  `,
  tabs: css`
    display: flex;
    gap: 2px;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      display: none;
    }
  `,
  tab: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    color: ${color.text3};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
    margin-bottom: -2px;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    border-bottom-color: ${color.brand};
    color: ${color.text};
    font-weight: ${font.weight.bold};
  `,
  dot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
  `,
  count: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r8}px;
    background: ${color.divider};
    color: ${color.text4};
  `,
  countOn: css`
    background: ${color.brandTint};
    color: ${color.brand};
  `,
  aiBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.brand};
    background: ${color.brandBg};
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    flex-shrink: 0;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
      margin-bottom: 4px;
    }
  `,
  aiLabel: css`
    ${responsive.md} {
      display: none;
    }
  `,
  body: css`
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  `,
  /** < md: chỉ hiện một cột (danh sách hoặc chat). */
  hideMobile: css`
    ${responsive.md} {
      display: none !important;
    }
  `,
  empty: css`
    flex: 1;
    display: grid;
    place-items: center;
    background: ${color.bg};
  `,
  toast: css`
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: ${z.popover};
    background: ${color.text};
    color: ${color.white};
    border-radius: ${radius.r10}px;
    padding: 8px 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    box-shadow: ${shadow.aiModal};
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.flyout};
  `,
}));
