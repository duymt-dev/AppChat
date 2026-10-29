// Dòng hội thoại + menu ⋯ — prototype L1650–1734 (+ CSS L57–58 hiện nút ⋯ khi hover).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useRowStyles = createStyles(({ css, responsive }) => ({
  row: css`
    display: flex;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid ${color.divider};
    border-left: 3px solid transparent;
    cursor: pointer;
    position: relative;
    &:hover {
      background: ${color.bg};
    }
    &:hover .conv-dots,
    &:focus-within .conv-dots {
      opacity: 1;
    }
  `,
  plain: css`
    border-left: none;
  `,
  on: css`
    background: ${color.brandBg};
    border-left-color: ${color.brand};
    &:hover {
      background: ${color.brandBg};
    }
  `,
  hit: css`
    position: absolute;
    inset: 0;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
  `,
  av: css`
    position: relative;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
  `,
  avatar: css`
    width: 44px;
    height: 44px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-weight: ${font.weight.bold};
    color: ${color.white};
    font-size: ${font.scale.s16}px;
  `,
  stack: css`
    position: absolute;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 2px solid ${color.surface};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
  `,
  ch: css`
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: 2px solid ${color.surface};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
  `,
  chLeft: css`
    right: auto;
    left: -2px;
  `,
  online: css`
    position: absolute;
    top: 0;
    right: 12px;
    width: 9px;
    height: 9px;
    border-radius: ${radius.r4}px;
    background: ${color.brand};
    border: 2px solid ${color.surface};
  `,
  main: css`
    flex: 1;
    min-width: 0;
  `,
  top: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 6px;
  `,
  name: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  time: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    flex-shrink: 0;
  `,
  preview: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  `,
  sender: css`
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
  `,
  tags: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 4px;
  `,
  tag: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.semibold};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  unread: css`
    margin-left: auto;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    border-radius: ${radius.r8}px;
    min-width: 16px;
    height: 16px;
    display: grid;
    place-items: center;
    padding: 0 4px;
  `,
  dots: css`
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${color.surface};
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    z-index: 3;
    padding: 0;
    opacity: 0;
    transition: opacity 0.14s;
    ${responsive.md} {
      opacity: 1;
      width: ${layout.touch}px;
      height: ${layout.touch}px;
      top: 4px;
      right: 4px;
      border: none;
      background: transparent;
    }
  `,
  dotsOn: css`
    opacity: 1;
  `,
  menu: css`
    position: absolute;
    top: 32px;
    right: 8px;
    width: 188px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.menu};
    padding: 6px;
    z-index: 36;
    text-align: left;
    cursor: default;
  `,
  item: css`
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
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
  grow: css`
    flex: 1;
  `,
  /** Prototype: "›" ở cỡ chữ mặc định 16px của trình duyệt → dòng có mũi tên cao 37px. */
  caret: css`
    color: ${color.text4};
    line-height: 1.5;
  `,
}));
