// "Trung tâm cập nhật" nổi góc phải — prototype L1138–1176 + tab style L8052.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow, z } from '@appchat/ui';

export const useWidgetStyles = createStyles(({ css, responsive }) => ({
  panel: css`
    position: fixed;
    right: 24px;
    bottom: 24px;
    width: 360px;
    max-height: 560px;
    z-index: ${z.flyout + 100};
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.widget};
    overflow: hidden;
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    ${responsive.md} {
      right: 8px;
      left: 8px;
      bottom: 68px;
      width: auto;
      max-height: 60vh;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: ${gradient.updates};
    color: ${color.white};
    flex-shrink: 0;
  `,
  title: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    flex: 1;
  `,
  min: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    font-size: ${font.scale.s16}px;
    color: ${color.whiteSoft};
    background: none;
    border: none;
    ${responsive.md} {
      width: 44px;
      height: 44px;
    }
  `,
  tabs: css`
    display: flex;
    border-bottom: 1px solid ${color.divider};
    flex-shrink: 0;
  `,
  tab: css`
    flex: 1;
    padding: 12px 8px;
    border: none;
    background: ${color.tabIdle};
    border-bottom: 2px solid transparent;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 44px;
  `,
  tabOn: css`
    background: ${color.surface};
    border-bottom-color: ${color.brand};
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  count: css`
    margin-left: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    background: ${color.amberBg};
    color: ${color.amberText};
    border-radius: ${radius.r8}px;
    padding: 2px 6px;
  `,
  countRed: css`
    background: ${color.roseBg};
    color: ${color.dangerDeep};
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    scrollbar-width: none;
  `,
  bar: css`
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  overdue: css`
    color: ${color.dangerStrong};
    font-weight: ${font.weight.bold};
  `,
  openAll: css`
    display: inline-flex;
    align-items: center;
    min-height: ${layout.chip}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-bottom: 1px solid ${color.divider};
  `,
  rowPad: css`
    padding: 12px 16px;
    cursor: pointer;
    align-items: flex-start;
  `,
  avatarWrap: css`
    position: relative;
    flex-shrink: 0;
  `,
  avatar: css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
  `,
  ch: css`
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 2px solid ${color.surface};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  svc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-top: 2px;
  `,
  tags: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
  `,
  tag: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.bold};
    padding: 2px 6px;
    border-radius: ${radius.r8}px;
  `,
  done: css`
    width: 30px;
    height: 30px;
    border: none;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    ${responsive.md} {
      width: 44px;
      height: 44px;
    }
  `,
  newsHead: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  `,
  newsTag: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  date: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  newsTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    line-height: 1.35;
    margin-bottom: 2px;
  `,
  newsDesc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.45;
  `,
  ntIcon: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  ntText: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    line-height: 1.4;
  `,
  time: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  unread: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${color.brand};
    flex-shrink: 0;
    margin-top: 4px;
  `,
  empty: css`
    padding: 24px 16px;
    text-align: center;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  pill: css`
    position: fixed;
    right: 24px;
    bottom: 24px;
    z-index: ${z.flyout + 100};
    display: flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 0 16px;
    border-radius: ${radius.r20}px;
    background: ${gradient.updates};
    color: ${color.white};
    box-shadow: ${shadow.widgetPill};
    cursor: pointer;
    border: none;
    font-family: ${font.family};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    ${responsive.md} {
      bottom: 72px;
      right: 12px;
    }
  `,
  pillCount: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    background: ${color.whiteGlass};
    border-radius: ${radius.r8}px;
    padding: 2px 6px;
  `,
}));
