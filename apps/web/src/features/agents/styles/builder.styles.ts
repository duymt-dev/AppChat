// Builder toàn màn — prototype L2291–2419: thanh trên, cột cấu hình (max 680) + cột kiểm thử (42%, 380–560). < md: một cột.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useBuilderStyles = createStyles(({ css, responsive }) => ({
  root: css`
    position: fixed;
    inset: 0;
    z-index: 200;
    background: ${color.surface};
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
    ${responsive.md} {
      z-index: 850;
    }
  `,
  bar: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid ${color.border};
    flex-shrink: 0;
    ${responsive.md} {
      padding: 8px 12px;
      gap: 8px;
    }
  `,
  back: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    font-size: ${font.scale.s20}px;
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  barTitle: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  cancel: css`
    display: inline-flex;
    align-items: center;
    min-height: ${layout.chip}px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    &:hover {
      background: ${color.brandBg};
      border-color: ${color.chipHoverLine};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  publish: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: ${layout.chip}px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    white-space: nowrap;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  body: css`
    flex: 1;
    display: flex;
    min-height: 0;
    ${responsive.md} {
      flex-direction: column;
      overflow-y: auto;
    }
  `,
  left: css`
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    /* prototype .appscroll ≤ 1440px: padding ngang 28 → 20 (L72) */
    padding: 24px 20px;
    background: ${color.surface};
    ${responsive.md} {
      overflow: visible;
      padding: 16px 12px;
    }
  `,
  col: css`
    max-width: 680px;
  `,
  right: css`
    width: 42%;
    max-width: 560px;
    min-width: 380px;
    border-left: 1px solid ${color.border};
    display: flex;
    flex-direction: column;
    background: ${color.surface};
    ${responsive.md} {
      width: 100%;
      min-width: 0;
      max-width: none;
      border-left: none;
      border-top: 1px solid ${color.border};
      min-height: 480px;
    }
  `,
  h: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  hSub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin: 4px 0 16px;
    line-height: 1.5;
  `,
  hMuted: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
  `,
  sec: css`
    margin-top: 28px;
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 6px;
  `,
  info: css`
    color: ${color.text4};
  `,
  nameRow: css`
    display: flex;
    gap: 12px;
    align-items: flex-end;
    margin-bottom: 6px;
  `,
  emojiWrap: css`
    position: relative;
  `,
  emoji: css`
    width: 44px;
    height: 44px;
    border-radius: ${radius.r12}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s24}px;
    cursor: pointer;
    border: none;
    padding: 0;
  `,
  emojiPop: css`
    position: absolute;
    top: 76px;
    left: 0;
    z-index: 20;
    width: 208px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.emojiPop};
    padding: 8px;
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
  `,
  emojiOpt: css`
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s20}px;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    &:hover {
      background: ${color.rowHover};
    }
  `,
  input: css`
    width: 100%;
    height: 44px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s15}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    color: ${color.text};
  `,
  field: css`
    width: 100%;
    height: 40px;
    min-height: 36px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    background: ${color.surface};
    color: ${color.text};
    cursor: pointer;
    outline: none;
    box-sizing: border-box;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  link: css`
    font-size: ${font.scale.s13}px;
    color: ${color.brand};
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  help: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 4px;
    line-height: 1.45;
  `,
  /* mô tả mức AI luôn giữ 2 dòng — chiều cao khối không nhảy khi đổi mức (prototype L2318) */
  tierHelp: css`
    min-height: 2.9em;
  `,
}));
