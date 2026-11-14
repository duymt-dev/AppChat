// Modal tạo tác vụ tự chủ — prototype L1317–1350 (680px).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useTaskFormStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.modalVeil};
    z-index: 600;
    display: grid;
    place-items: center;
    padding: 24px;
    ${responsive.md} {
      padding: 0;
      z-index: 900;
    }
  `,
  box: css`
    width: ${layout.cwModal}px;
    max-width: 100%;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: ${color.surface};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.cwModal};
    overflow: hidden;
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
    ${responsive.md} {
      width: 100vw;
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    border-bottom: 1px solid ${color.divider};
  `,
  icon: css`
    width: 38px;
    height: 38px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  title: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  label: css`
    display: block;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    margin-bottom: 6px;
  `,
  input: css`
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  area: css`
    height: 96px;
    padding: 12px;
    resize: none;
    line-height: 1.55;
    ${responsive.md} {
      height: 120px;
    }
  `,
  quick: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 8px;
    align-items: center;
  `,
  quickLabel: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  quickChip: css`
    display: inline-flex;
    align-items: center;
    height: 26px;
    padding: 0 8px;
    border-radius: ${radius.pill}px;
    border: 1px solid ${color.border};
    background: ${color.bg};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  opts: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  `,
  opt: css`
    display: inline-flex;
    align-items: center;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  optOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.pillBg};
    border-radius: ${radius.r8}px;
    gap: 2px;
  `,
  segBtn: css`
    flex: 1;
    text-align: center;
    height: 32px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    color: ${color.text3};
    border: none;
    background: transparent;
    font-family: inherit;
    ${responsive.md} {
      height: 40px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  safety: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 4px 12px;
  `,
  safeRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    & + & {
      border-top: 1px solid ${color.divider};
    }
  `,
  safeLabel: css`
    flex: 1;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
  always: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.brandBg};
    border-radius: ${radius.r4}px;
    padding: 2px 6px;
  `,
  sw: css`
    width: 38px;
    height: 22px;
    border-radius: ${radius.r12}px;
    position: relative;
    flex-shrink: 0;
    cursor: pointer;
    border: none;
    padding: 0;
    & > span {
      position: absolute;
      top: 2px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: ${color.white};
      box-shadow: ${shadow.segOn};
    }
  `,
  budget: css`
    width: 90px;
    height: 32px;
    padding: 0 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    outline: none;
    text-align: right;
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
    background: ${color.tabIdle};
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  footHint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    flex: 1;
  `,
  cancel: css`
    display: inline-flex;
    align-items: center;
    height: 38px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  save: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 38px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    &:disabled {
      background: ${color.disabled};
      cursor: not-allowed;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
