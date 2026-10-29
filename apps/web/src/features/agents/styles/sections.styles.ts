// Các khối cấu hình trong builder — Hướng dẫn, kênh / intent (chip), hành động / governance (switch), kiến thức — prototype L2321–2398.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useSectionStyles = createStyles(({ css, responsive }) => ({
  guide: css`
    margin-top: 24px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  guideTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
  `,
  guideSub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin: 4px 0 12px;
    line-height: 1.55;
  `,
  editor: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    overflow: hidden;
  `,
  area: css`
    width: 100%;
    border: none;
    outline: none;
    resize: vertical;
    padding: 12px;
    font-size: ${font.scale.s14}px;
    font-family: ${font.mono};
    line-height: 1.6;
    box-sizing: border-box;
    display: block;
    color: ${color.text};
  `,
  tools: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-top: 1px solid ${color.divider};
    background: ${color.bg};
    position: relative;
  `,
  toolIcons: css`
    display: flex;
    gap: 8px;
  `,
  tplBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: ${layout.chip}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    padding: 0;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  optimize: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    min-height: ${layout.chip}px;
    padding: 0 12px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tplPop: css`
    position: absolute;
    bottom: 40px;
    right: 96px;
    z-index: 20;
    width: 220px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    box-shadow: ${shadow.emojiPop};
    padding: 4px;
    ${responsive.md} {
      right: 8px;
    }
  `,
  tplOpt: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: ${radius.r6}px;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    width: 100%;
    border: none;
    background: transparent;
    font-family: inherit;
    text-align: left;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  learn: css`
    margin-top: 8px;
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${radius.r20}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  chOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  intentOn: css`
    border-color: transparent;
    background: ${color.brand};
    color: ${color.white};
  `,
  dot: css`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  connect: css`
    border: 1px dashed ${color.disabled};
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  intentsGap: css`
    margin-bottom: 12px;
  `,
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  toolGroups: css`
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  toolGroup: css``,
  toolGroupHead: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 8px;
  `,
  toolGroupTitle: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: ${color.text4};
  `,
  toolGroupCount: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  rowBadge: css`
    flex-shrink: 0;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
    background: ${color.pillBg};
    color: ${color.text4};
    white-space: nowrap;
  `,
  row: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `,
  rowGrow: css`
    flex: 1;
    min-width: 0;
  `,
  rowT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  rowD: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    line-height: 1.5;
  `,
  swHit: css`
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    flex-shrink: 0;
    display: grid;
    place-items: center;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  sw: css`
    width: 42px;
    height: 24px;
    border-radius: ${radius.r12}px;
    position: relative;
    display: block;
    span {
      position: absolute;
      top: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${color.white};
      box-shadow: ${shadow.knob};
    }
  `,
  box: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 12px;
  `,
  thText: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    margin-bottom: 12px;
    b {
      color: ${color.text};
    }
  `,
  range: css`
    width: 100%;
    accent-color: ${color.brand};
    cursor: pointer;
  `,
  thScale: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
  `,
  gap12: css`
    margin-bottom: 12px;
  `,
  notice: css`
    background: ${color.noticeBg};
    border: 1px solid ${color.noticeLine};
    border-radius: ${radius.r10}px;
    padding: 12px 16px;
    font-size: ${font.scale.s14}px;
    color: ${color.noticeText};
    line-height: 1.55;
    margin-bottom: 12px;
  `,
  kb: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 28px;
    text-align: center;
  `,
  kbIcon: css`
    width: 44px;
    height: 44px;
    border-radius: ${radius.r12}px;
    background: ${color.brandBg};
    display: inline-grid;
    place-items: center;
    margin-bottom: 8px;
  `,
  kbTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
  `,
  kbSub: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin: 6px auto 0;
    max-width: 380px;
    line-height: 1.55;
  `,
  kbBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    height: 38px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    margin-top: 16px;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
