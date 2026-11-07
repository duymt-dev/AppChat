// Wizard tạo chiến dịch (1140px) — prototype L3666–3797: đầu (tiêu đề + 4 bước), thân theo bước, chân (tóm tắt + nút).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const btn = `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  border-radius: ${radius.r8}px;
  padding: 0 12px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
`;

export const useWizardStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.dimVeil};
    z-index: ${z.mkPage};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    background: ${color.surface};
    width: min(1140px, 100%);
    max-height: 90vh;
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.crmModal};
    display: flex;
    flex-direction: column;
    overflow: hidden;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      height: 100dvh;
      max-height: 100dvh;
      border-radius: 0;
    }
  `,
  head: css`
    padding: 16px 24px;
    border-bottom: 1px solid ${color.border};
    ${responsive.md} {
      padding: 12px 16px;
    }
  `,
  hRow: css`
    display: flex;
    align-items: center;
    margin-bottom: 12px;
  `,
  hT: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.01em;
    color: ${color.text};
  `,
  hS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  x: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  steps: css`
    display: flex;
    gap: 6px;
    align-items: center;
    overflow-x: auto;
  `,
  step: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px;
    border-radius: ${radius.r20}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.medium};
    background: ${color.muteBg};
    color: ${color.text4};
    white-space: nowrap;
  `,
  stepDone: css`
    background: ${color.brandBg};
    color: ${color.brandInkDeep};
  `,
  stepOn: css`
    font-weight: ${font.weight.bold};
    background: ${color.brand};
    color: ${color.white};
  `,
  num: css`
    width: 18px;
    height: 18px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    background: ${color.border};
    color: ${color.text4};
  `,
  numDone: css`
    background: ${color.brand};
    color: ${color.white};
  `,
  numOn: css`
    background: ${color.mkGlass3};
    color: ${color.white};
  `,
  body: css`
    flex: 1;
    overflow: auto;
    padding: 20px 24px;
    min-height: 320px;
    ${responsive.md} {
      padding: 16px;
    }
  `,
  sec: css`
    margin-bottom: 16px;
  `,
  secT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 6px;
  `,
  secS: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  aiBox: css`
    border: 1px solid ${color.brandLine};
    background: ${color.brandBg};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 16px;
  `,
  aiH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    color: ${color.brandInk};
    text-transform: uppercase;
  `,
  aiGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px 20px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  aiKv: css`
    display: grid;
    grid-template-columns: 148px 1fr;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    line-height: 1.55;
    span:first-of-type {
      color: ${color.mkAiKey};
      font-weight: ${font.weight.semibold};
    }
    span:last-of-type {
      color: ${color.brandInkDeep};
      font-weight: ${font.weight.semibold};
    }
  `,
  chans: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  chan: css`
    padding: 12px;
    border: 2px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    display: flex;
    gap: 12px;
    align-items: flex-start;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
  `,
  chanOn: css`
    border-color: ${color.brand};
    background: ${color.mkBrandSoft};
  `,
  chIc: css`
    width: 36px;
    height: 36px;
    border-radius: ${radius.r10}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  chN: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;
    b {
      font-size: ${font.scale.s15}px;
      color: ${color.text};
    }
  `,
  cost: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    padding: 2px 6px;
    background: ${color.muteBg};
    border-radius: ${radius.r4}px;
  `,
  chD: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.4;
  `,
  radio: css`
    width: 20px;
    height: 20px;
    border-radius: ${radius.r10}px;
    border: 2px solid ${color.border};
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    margin-top: 2px;
  `,
  radioOn: css`
    border-color: ${color.brand};
    background: ${color.brand};
  `,
  input: css`
    width: 100%;
    height: 38px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 4px;
  `,
  field: css`
    margin-bottom: 12px;
  `,
  foot: css`
    padding: 12px 24px;
    border-top: 1px solid ${color.border};
    display: flex;
    gap: 8px;
    align-items: center;
    background: ${color.bg};
    flex-wrap: wrap;
    ${responsive.md} {
      padding: 12px 16px;
    }
  `,
  sum: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    ${clip}
  `,
  ghost: css`
    ${btn}
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    ${btn}
    padding: 0 16px;
    border: none;
    background: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:disabled {
      opacity: 0.6;
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
