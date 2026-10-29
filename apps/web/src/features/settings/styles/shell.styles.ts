// SettingsShell — prototype L5754–5776: topbar (tiêu đề 24, phụ đề, ô tìm 240, chip Tài liệu), nav trái 280 (nhóm + mục), panel chính
// nền xám padding 28 / 36 với eyebrow "Settings" + tiêu đề 28. < md: nav thành dải chip cuộn ngang.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useShellStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
    font-family: ${font.family};
    line-height: normal;
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 20px 12px;
    ${responsive.md} {
      flex-wrap: wrap;
      padding: 12px;
    }
  `,
  title: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.02em;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    ${responsive.md} {
      display: none;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  search: css`
    position: relative;
    display: flex;
    align-items: center;
    svg {
      position: absolute;
      left: 8px;
    }
    input {
      height: 36px;
      width: 240px;
      padding-left: 28px;
      border: 1px solid ${color.border};
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
      outline: none;
      font-family: inherit;
      box-sizing: border-box;
    }
    ${responsive.md} {
      flex: 1;
      input {
        width: 100%;
        height: ${layout.touch}px;
      }
    }
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  body: css`
    flex: 1;
    display: flex;
    min-height: 0;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  nav: css`
    width: 280px;
    flex-shrink: 0;
    border-right: 1px solid ${color.border};
    background: ${color.surface};
    padding: 12px 8px;
    overflow-y: auto;
    box-sizing: border-box;
    scrollbar-width: none;
    ${responsive.md} {
      width: 100%;
      display: flex;
      gap: 8px;
      overflow-x: auto;
      border-right: none;
      border-bottom: 1px solid ${color.border};
      padding: 8px 12px;
    }
  `,
  group: css`
    padding: 12px 12px 6px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
    letter-spacing: 0.08em;
    ${responsive.md} {
      display: none;
    }
  `,
  item: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    text-align: left;
    margin-bottom: 2px;
    background: transparent;
    color: ${color.text};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      width: auto;
      flex-shrink: 0;
      white-space: nowrap;
      min-height: ${layout.touch}px;
      margin: 0;
      border: 1px solid ${color.border};
    }
  `,
  itemOn: css`
    && {
      background: ${color.brandBg};
      color: ${color.brandInk};
      font-weight: ${font.weight.semibold};
    }
  `,
  n: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.medium};
  `,
  badge: css`
    padding: 2px 6px;
    border-radius: ${radius.r4}px;
    background: ${gradient.ai};
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.04em;
  `,
  main: css`
    flex: 1;
    min-width: 0;
    background: ${color.bg};
    overflow-y: auto;
    scrollbar-width: none;
  `,
  pad: css`
    padding: 28px 36px;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  head: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 20px;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    margin-bottom: 6px;
  `,
  h1: css`
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.bold};
    letter-spacing: -0.01em;
    color: ${color.text};
    ${responsive.md} {
      font-size: ${font.scale.s22}px;
    }
  `,
  hSub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin-top: 4px;
  `,
}));
