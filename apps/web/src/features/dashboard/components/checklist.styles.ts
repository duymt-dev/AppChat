// Checklist onboarding — prototype L1089–1129 + style bước L9201–9214.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useChecklistStyles = createStyles(({ css, responsive }) => ({
  card: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    box-shadow: ${shadow.cardSoft};
    overflow: hidden;
  `,
  head: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px 16px 12px;
  `,
  icon: css`
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: ${radius.r10}px;
    background: ${gradient.brandSoft};
    display: grid;
    place-items: center;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
    text-align: left;
  `,
  title: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: -0.01em;
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
  `,
  collapse: css`
    flex-shrink: 0;
    min-height: ${layout.chip}px;
    padding: 4px 8px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text3};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      min-height: 44px;
    }
  `,
  progress: css`
    padding: 0 16px 6px;
  `,
  count: css`
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin-bottom: 6px;
    font-size: ${font.scale.s13}px;
  `,
  countOn: css`
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  countPct: css`
    color: ${color.text4};
  `,
  bar: css`
    height: 7px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    overflow: hidden;
  `,
  barFill: css`
    height: 100%;
    border-radius: ${radius.r4}px;
    background: ${gradient.brandBar};
  `,
  list: css`
    padding: 6px 16px 12px;
  `,
  step: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 4px;
    border-top: 1px solid ${color.divider};
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  circle: css`
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    margin-top: 2px;
    border-radius: 50%;
    cursor: pointer;
    display: grid;
    place-items: center;
    padding: 0;
    border: 2px solid ${color.border};
    background: ${color.surface};
    & svg {
      visibility: hidden;
    }
  `,
  circleOn: css`
    border: none;
    background: ${color.brand};
    & svg {
      visibility: visible;
    }
  `,
  chipIcon: css`
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    background: ${color.bg};
    color: ${color.text3};
  `,
  chipOn: css`
    background: ${color.brandBg};
    color: ${color.brandDeep};
  `,
  stepTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  stepDone: css`
    text-decoration: line-through;
    opacity: 0.6;
  `,
  stepDesc: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 2px;
    line-height: 1.45;
  `,
  stepCta: css`
    flex-shrink: 0;
    margin-top: 2px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    white-space: nowrap;
    border: 1px solid transparent;
    background: ${color.brand};
    color: ${color.white};
    font-family: inherit;
    ${responsive.md} {
      min-height: 44px;
      margin-left: 36px;
    }
  `,
  stepCtaDone: css`
    border-color: ${color.border};
    background: ${color.surface};
    color: ${color.text3};
  `,
  mini: css`
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    text-align: left;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.cardSoft};
    padding: 12px 16px;
    cursor: pointer;
    font-family: inherit;
  `,
  miniIcon: css`
    flex-shrink: 0;
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${gradient.brandSoft};
    display: grid;
    place-items: center;
  `,
  miniTitle: css`
    display: block;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  miniSub: css`
    display: block;
    font-size: ${font.scale.s11}px;
    color: ${color.text3};
  `,
  miniBar: css`
    flex-shrink: 0;
    height: 6px;
    width: 90px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    overflow: hidden;
    ${responsive.md} {
      display: none;
    }
  `,
  miniOpen: css`
    flex-shrink: 0;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brand};
  `,
}));
