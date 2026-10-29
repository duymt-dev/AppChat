// Style shell — giá trị lấy từ prototype L637–1078 qua token packages/ui (không hard-code trong component).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

export const useShellStyles = createStyles(({ css, responsive }) => ({
  shell: css`
    display: flex;
    height: 100vh;
    width: 100%;
    overflow: hidden;
    background: ${color.bg};
    font-family: ${font.family};
    color: ${color.text};
    line-height: normal;
    min-width: ${layout.minShell}px;
    ${responsive.md} {
      min-width: 0;
      flex-direction: column;
    }
  `,
  main: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
    position: relative;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      width: 0;
    }
    ${responsive.md} {
      padding-bottom: ${layout.mobileTabH + 4}px;
    }
  `,
  rail: css`
    background: ${color.rail};
    display: flex;
    flex-direction: column;
    padding: 12px 0 10px;
    flex-shrink: 0;
    position: relative;
    z-index: ${z.rail};
    transition: width 0.18s;
    ${responsive.md} {
      display: none;
    }
  `,
  railExp: css`
    width: ${layout.railExpanded}px;
    align-items: stretch;
  `,
  railCol: css`
    width: ${layout.railCollapsed}px;
    align-items: center;
  `,
  brandRow: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 14px 10px;
    box-sizing: border-box;
  `,
  brandCol: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 0 0 10px;
    box-sizing: border-box;
  `,
  brandText: css`
    flex: 1;
    font-size: ${font.size.brand}px;
    font-weight: ${font.weight.heavy};
    color: ${color.white};
    letter-spacing: -0.01em;
  `,
  railToggleExp: css`
    width: ${layout.railToggle}px;
    height: ${layout.railToggle}px;
  `,
  railToggleCol: css`
    width: 34px;
    height: 30px;
  `,
  railScrollExp: css`
    align-items: stretch;
    padding: 2px 12px;
  `,
  railScrollCol: css`
    align-items: center;
    padding: 2px 0;
  `,
  navSlot: css`
    position: relative;
    width: 100%;
    display: flex;
  `,
  navSlotCol: css`
    justify-content: center;
  `,
  railScroll: css`
    flex: 1;
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-height: 0;
    box-sizing: border-box;
    scrollbar-width: none;
    &::-webkit-scrollbar {
      width: 0;
    }
    & > * {
      flex-shrink: 0;
    }
  `,
  logo: css`
    width: ${layout.railLogo}px;
    height: ${layout.railLogo}px;
    border-radius: ${radius.xl}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    overflow: hidden;
    & img {
      width: ${layout.railLogoImg}px;
      height: ${layout.railLogoImg}px;
      object-fit: contain;
      display: block;
      filter: brightness(0) invert(1);
    }
  `,
  railToggle: css`
    border-radius: ${radius.sm}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    background: ${color.railBtnBg};
    border: none;
    padding: 0;
  `,
  navi: css`
    border-radius: ${radius.lg}px;
    display: flex;
    cursor: pointer;
    position: relative;
    box-sizing: border-box;
    line-height: 1;
    border: none;
    background: transparent;
    font-family: inherit;
    padding: 0;
    &:hover {
      background: ${color.railHover};
    }
  `,
  naviCollapsed: css`
    width: ${layout.railItemW}px;
    height: ${layout.railItemH}px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    text-align: center;
  `,
  naviExpanded: css`
    width: 100%;
    height: ${layout.railItemExpH}px;
    border-radius: ${radius.md}px;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 12px;
    padding: 0 14px;
  `,
  naviActive: css`
    background: ${color.railActiveBg};
    box-shadow: ${shadow.railActive};
  `,
  label: css`
    font-size: ${font.size.railLabel}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
  `,
  labelExpanded: css`
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.medium};
    color: ${color.railText};
    white-space: nowrap;
  `,
  labelActive: css`
    color: ${color.white};
  `,
  labelActiveExpanded: css`
    font-weight: ${font.weight.bold};
  `,
  badge: css`
    position: absolute;
    top: 4px;
    right: 12px;
    background: ${color.danger};
    color: ${color.white};
    font-size: ${font.size.xxs}px;
    font-weight: ${font.weight.bold};
    border-radius: 7px;
    padding: 1px 5px;
    line-height: 1.5;
  `,
}));
