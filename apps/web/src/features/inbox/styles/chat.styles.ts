// Khung chat: header · ghim · luồng tin — prototype L1736–1810 (kiểu WhatsApp).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useChatStyles = createStyles(({ css, responsive }) => ({
  col: css`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    background: ${color.surface};
  `,
  head: css`
    padding: 8px 16px;
    border-bottom: 1px solid ${color.border};
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.chatHead};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 4px 8px;
      gap: 8px;
    }
  `,
  back: css`
    display: none;
    ${responsive.md} {
      display: grid;
      place-items: center;
      width: ${layout.touch}px;
      height: ${layout.touch}px;
      border: none;
      background: none;
      cursor: pointer;
      padding: 0;
    }
  `,
  avatar: css`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s15}px;
    flex-shrink: 0;
  `,
  stackWrap: css`
    position: relative;
    width: 40px;
    height: 40px;
    flex-shrink: 0;
  `,
  stack: css`
    position: absolute;
    width: 27px;
    height: 27px;
    border-radius: 50%;
    border: 2px solid ${color.chatHead};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
  `,
  who: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-weight: ${font.weight.semibold};
    font-size: ${font.scale.s16}px;
    color: ${color.chatTitle};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  meta: css`
    font-size: ${font.scale.s14}px;
    color: ${color.chatSub};
    margin-top: 2px;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    overflow: hidden;
  `,
  sepDot: css`
    opacity: 0.5;
  `,
  chBadge: css`
    width: 14px;
    height: 14px;
    border-radius: ${radius.r4}px;
    display: inline-grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  icons: css`
    display: flex;
    align-items: center;
    flex-shrink: 0;
  `,
  iconBtn: css`
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  hideMobile: css`
    ${responsive.md} {
      display: none;
    }
  `,
  pin: css`
    border-bottom: 1px solid ${color.border};
    background: ${gradient.pinned};
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: ${font.scale.s14}px;
    flex-shrink: 0;
    color: ${color.text};
    ${responsive.md} {
      padding: 4px 12px;
      gap: 8px;
    }
  `,
  pinLabel: css`
    color: ${color.pinText};
    font-weight: ${font.weight.semibold};
    flex-shrink: 0;
  `,
  pinText: css`
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  unpin: css`
    font-size: ${font.scale.s12}px;
    color: ${color.pinText};
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    padding: 0;
    &:hover {
      text-decoration: underline;
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  thread: css`
    flex: 1;
    overflow-y: auto;
    padding: 16px 24px;
    background: ${gradient.thread};
    ${responsive.md} {
      padding: 12px;
    }
  `,
}));
