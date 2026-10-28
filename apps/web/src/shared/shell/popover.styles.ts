// Popover đáy rail (thông báo L903, menu avatar L1034) + flyout (L812, L824).
import { createStyles } from 'antd-style';
import { color, font, radius, shadow, z } from '@appchat/ui';

export const usePopoverStyles = createStyles(({ css }) => ({
  panel: css`
    position: absolute;
    left: calc(100% + 8px);
    bottom: 0;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.xxl}px;
    box-shadow: ${shadow.popover};
    z-index: ${z.flyout};
    overflow: hidden;
    text-align: left;
  `,
  head: css`
    display: flex;
    align-items: center;
    padding: 13px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  headTitle: css`
    font-size: ${font.size.title}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
  `,
  link: css`
    font-size: ${font.size.small}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandDeep};
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
    &:hover {
      text-decoration: underline;
    }
  `,
  list: css`
    max-height: 340px;
    overflow-y: auto;
  `,
  notif: css`
    display: flex;
    gap: 11px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.dividerSoft};
    &:last-child {
      border-bottom: none;
    }
  `,
  notifIcon: css`
    width: 32px;
    height: 32px;
    border-radius: 9px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  notifTitle: css`
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  notifAgo: css`
    font-size: ${font.size.small}px;
    color: ${color.text4};
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 9px 10px;
    border-radius: ${radius.sm}px;
    cursor: pointer;
    font-size: ${font.size.body}px;
    color: ${color.text};
    &:hover {
      background: #fafbfa;
    }
  `,
  sep: css`
    height: 1px;
    background: ${color.divider};
    margin: 6px 4px;
  `,
  flyout: css`
    position: fixed;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.lg}px;
    box-shadow: ${shadow.flyout};
    padding: 6px;
    z-index: ${z.flyout};
    text-align: left;
  `,
  eyebrow: css`
    font-size: ${font.size.eyebrow}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    padding: 6px 10px 7px;
  `,
  flyRow: css`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 10px;
    border-radius: ${radius.sm}px;
    cursor: pointer;
    font-size: ${font.size.body}px;
    font-weight: ${font.weight.medium};
    color: ${color.text};
    &:hover {
      background: #fafbfa;
    }
  `,
}));

export const NOTIF_TONES = {
  warn: { bg: color.warnBg, fg: color.warn },
  danger: { bg: color.dangerBg, fg: color.dangerStrong },
  info: { bg: color.infoBg, fg: color.info },
  teal: { bg: color.tealBg, fg: color.teal },
} as const;
