// Đáy rail: thông báo / Nâng cấp / tin tức / trial badge / avatar — prototype L849–882.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useRailFootStyles = createStyles(({ css }) => ({
  foot: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px 0;
    position: relative;
    box-sizing: border-box;
  `,
  footBtn: css`
    width: ${layout.railItemW}px;
    padding: 6px 0;
    border-radius: ${radius.lg}px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    position: relative;
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    &:hover {
      background: ${color.railHover};
    }
    & > span:not([data-dot]) {
      font-size: ${font.size.xxs}px;
      font-weight: ${font.weight.semibold};
    }
  `,
  dot: css`
    position: absolute;
    top: 2px;
    right: 15px;
    width: 7px;
    height: 7px;
    border-radius: 4px;
    background: ${color.danger};
    border: 2px solid ${color.text};
  `,
  news: css`
    width: 100%;
    background: ${gradient.news};
    border: 1px solid ${color.brandBorder};
    border-radius: ${radius.xxl}px;
    padding: 14px;
    box-sizing: border-box;
    margin-bottom: 4px;
  `,
  newsTitle: css`
    font-size: 14.9px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1.25;
    margin-bottom: 5px;
  `,
  newsBody: css`
    font-size: ${font.size.small}px;
    color: ${color.text3};
    line-height: 1.5;
    margin-bottom: 10px;
  `,
  newsLink: css`
    font-size: 13.2px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  newsDots: css`
    display: flex;
    justify-content: center;
    gap: 6px;
    margin: 12px 0 2px;
    & span {
      width: 7px;
      height: 7px;
      border-radius: 4px;
      background: ${color.brandDot};
    }
    & span[data-on] {
      width: 20px;
      background: ${color.brand};
    }
  `,
  trial: css`
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.size.caption}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    width: 100%;
    box-sizing: border-box;
    margin-bottom: 8px;
    background: ${color.brandBg};
    border: 1px solid ${color.trialBorder};
    color: ${color.brandInkDeep};
    & i {
      width: 6px;
      height: 6px;
      border-radius: 4px;
      flex-shrink: 0;
      background: ${color.brand};
    }
  `,
  upgradeBtn: css`
    width: 100%;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: ${gradient.upgrade};
    color: ${color.white};
    border-radius: ${radius.xl}px;
    /* prototype: inline 46px bị class .btnp ép về 36px */
    height: 36px;
    font-size: ${font.size.upgrade}px;
    font-weight: ${font.weight.heavy};
    cursor: pointer;
    box-shadow: ${shadow.upgradeBtn};
    border: none;
    font-family: inherit;
  `,
  collapsedBtns: css`
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  `,
  meText: css`
    flex: 1;
    min-width: 0;
  `,
  sep: css`
    width: 48px;
    height: 1px;
    background: ${color.railSep};
  `,
  me: css`
    display: flex;
    align-items: center;
    gap: 9px;
    cursor: pointer;
    padding: 4px;
    width: 100%;
    box-sizing: border-box;
    border-radius: ${radius.md}px;
    border: none;
    background: transparent;
    font-family: inherit;
  `,
  avatar: css`
    width: ${layout.avatar}px;
    height: ${layout.avatar}px;
    border-radius: 50%;
    background: ${gradient.avatar};
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.size.title}px;
    box-shadow: ${shadow.avatarRing};
    flex-shrink: 0;
  `,
  meName: css`
    display: block;
    font-size: 13.8px;
    font-weight: ${font.weight.bold};
    color: ${color.white};
    white-space: nowrap;
    text-align: left;
  `,
  meTitle: css`
    display: block;
    font-size: ${font.size.eyebrow}px;
    color: ${color.railMuted};
    text-align: left;
  `,
  meShort: css`
    font-size: ${font.size.railLabel}px;
    font-weight: ${font.weight.semibold};
    color: ${color.railMuted2};
  `,
}));
