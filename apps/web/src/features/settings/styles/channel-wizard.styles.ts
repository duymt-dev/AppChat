// Wizard kết nối kênh 3 bước (B10) — prototype L777–868.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useChannelWizardStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.veil};
    z-index: 1600;
    display: grid;
    place-items: center;
    padding: 20px;
  `,
  box: css`
    width: 600px;
    max-width: 100%;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    background: ${color.white};
    border-radius: ${radius.r16}px;
    overflow: hidden;
    ${responsive.md} {
      width: 100%;
      max-height: 100%;
      height: 100%;
      border-radius: 0;
    }
  `,
  head: css`
    padding: 16px 20px 12px;
    border-bottom: 1px solid ${color.divider};
  `,
  headRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  logo: css`
    width: 40px;
    height: 40px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  headGrow: css`
    flex: 1;
    min-width: 0;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.brandInk};
  `,
  headTitle: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: none;
    flex-shrink: 0;
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px;
  `,
  pickGrid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  pickItem: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.divider};
    border-radius: ${radius.r10}px;
    background: ${color.white};
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    &:disabled {
      cursor: default;
      opacity: 0.5;
    }
  `,
  pickLogo: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  pickName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  steps: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
  `,
  step: css`
    display: flex;
    align-items: center;
    gap: 6px;
    flex: 1;
    min-width: 0;
  `,
  dot: css`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
    background: ${color.divider};
    color: ${color.text4};
  `,
  dotOn: css`
    background: ${color.brand};
    color: ${color.white};
  `,
  dotDone: css`
    background: ${color.brandInk};
    color: ${color.white};
  `,
  lbl: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text4};
    white-space: nowrap;
  `,
  lblOn: css`
    color: ${color.text};
  `,
  line: css`
    flex: 1;
    height: 2px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    min-width: 10px;
  `,
  qrWrap: css`
    display: flex;
    gap: 20px;
    align-items: center;
    flex-wrap: wrap;
  `,
  qrBox: css`
    width: 184px;
    height: 184px;
    border-radius: ${radius.r12}px;
    border: 1px solid ${color.border};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  qrImg: css`
    width: 168px;
    height: 168px;
    image-rendering: pixelated;
  `,
  qrTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    margin-bottom: 8px;
  `,
  qrSteps: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  qrStepRow: css`
    display: flex;
    gap: 8px;
  `,
  qrN: css`
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  qrWait: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  qrWaitDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
    background: ${color.warnAmber};
  `,
  qrSide: css`
    flex: 1;
    min-width: 220px;
  `,
  qrLabelField: css`
    margin-top: 12px;
  `,
  form: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  testRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  testOk: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  hint: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    line-height: 1.55;
  `,
  grid2: css`
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
    background: ${color.mutedBg};
    border-radius: ${radius.r10}px;
    gap: 2px;
  `,
  segBtn: css`
    flex: 1;
    text-align: center;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    background: transparent;
    color: ${color.text3};
    font-family: inherit;
  `,
  segOn: css`
    && {
      background: ${color.surface};
      color: ${color.text};
      box-shadow: ${shadow.cardSoft};
    }
  `,
  foot: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px;
    border-top: 1px solid ${color.divider};
    background: ${color.tabIdle};
  `,
  grow: css`
    flex: 1;
  `,
  soon: css`
    text-align: center;
    padding: 24px 12px;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
}));
