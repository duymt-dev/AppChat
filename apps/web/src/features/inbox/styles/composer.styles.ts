// Ô soạn tin + thẻ AI gợi ý + popover (trả lời nhanh / đặt lịch / dịch) — prototype L1798–1902.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

export const useComposerStyles = createStyles(({ css, responsive }) => ({
  wrap: css`
    padding: 8px 12px 12px;
    border-top: 1px solid ${color.border};
    background: ${color.bg};
    flex-shrink: 0;
    position: relative;
    ${responsive.md} {
      padding: 8px;
    }
  `,
  modes: css`
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
    ${responsive.md} {
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar {
        display: none;
      }
    }
  `,
  mode: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    border: 1px solid transparent;
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `,
  modeOn: css`
    font-weight: ${font.weight.bold};
    border-color: ${color.border};
    background: ${color.surface};
  `,
  grow: css`
    flex: 1;
  `,
  tool: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: ${layout.chip}px;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      white-space: nowrap;
      flex-shrink: 0;
    }
  `,
  toolOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
  `,
  auto: css`
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInk};
    background: ${color.brandBg};
    border-radius: ${radius.r4}px;
    padding: 2px 4px;
  `,
  box: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 8px 12px;
  `,
  boxNote: css`
    border-color: ${color.alertLine};
    background: ${color.alertBg};
  `,
  /** Trích dẫn tin đang trả lời (REQ-C09 "Trả lời"). */
  replyBar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    margin-bottom: 6px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    border-left: 2px solid ${color.brand};
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  replyX: css`
    display: grid;
    place-items: center;
    width: 20px;
    height: 20px;
    border: none;
    background: none;
    cursor: pointer;
    flex-shrink: 0;
  `,
  input: css`
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    background: transparent;
    font-family: inherit;
    font-size: ${font.scale.s15}px;
    line-height: 1.5;
    color: ${color.text};
    padding: 4px 0 8px;
    min-height: 34px;
    &::placeholder {
      color: ${color.placeholder};
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 12px;
    color: ${color.chatIcon};
    ${responsive.md} {
      gap: 4px;
    }
  `,
  plus: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    background: none;
    padding: 0;
    &:hover {
      background: ${color.divider};
      border-color: ${color.brand};
    }
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  ico: css`
    display: grid;
    place-items: center;
    border: none;
    background: none;
    padding: 0;
    cursor: pointer;
    color: inherit;
    ${responsive.md} {
      display: none;
    }
  `,
  via: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    white-space: nowrap;
    ${responsive.md} {
      display: none;
    }
  `,
  kbd: css`
    font-family: inherit;
    font-size: ${font.scale.s11}px;
    background: ${color.divider};
    border: 1px solid ${color.border};
    border-radius: ${radius.r4}px;
    padding: 2px 4px;
  `,
  send: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    cursor: pointer;
    border: none;
    font-family: inherit;
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  react: css`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  emoji: css`
    font-size: ${font.scale.s18}px;
    cursor: pointer;
    border: none;
    background: none;
    padding: 0;
    line-height: 1;
  `,
  suggest: css`
    margin-top: 6px;
    border: 1px solid ${color.brandEdge};
    border-radius: ${radius.r12}px;
    background: ${gradient.aiSoft};
    overflow: hidden;
  `,
  suggestIconHandoff: css`
    background: ${color.dangerStrong};
  `,
  suggestTitle: css`
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  confHandoff: css`
    color: ${color.hotText};
    background: ${color.dangerBg};
  `,
  suggestHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.brandEdgeSoft};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  suggestIcon: css`
    width: 24px;
    height: 24px;
    border-radius: ${radius.r6}px;
    background: ${gradient.aiAgent};
    display: grid;
    place-items: center;
  `,
  conf: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    background: ${color.violetBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    margin-left: auto;
  `,
  suggestBody: css`
    padding: 12px;
  `,
  suggestText: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text};
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
  `,
  actions: css`
    display: flex;
    gap: 8px;
    margin-top: 8px;
    flex-wrap: wrap;
  `,
  primary: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 36px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  ghost: css`
    min-height: ${layout.chip}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));
