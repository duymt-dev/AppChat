// Hồ sơ 360° (khách / nhóm) — prototype L1903–2224 (380px, ≤ 1440 → 340px; ≤ 1180 trượt phủ; < md full màn).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow, z } from '@appchat/ui';

export const usePanelStyles = createStyles(({ css, responsive }) => ({
  panel: css`
    width: ${layout.inbox360}px;
    border-left: 1px solid ${color.border};
    background: ${color.surface};
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    @media (max-width: 1180px) {
      position: fixed;
      right: 0;
      top: 0;
      bottom: 0;
      width: min(400px, 88vw);
      z-index: ${z.flyout};
      box-shadow: ${shadow.panelSlide};
    }
    ${responsive.md} {
      width: 100vw;
      bottom: ${layout.mobileTabH}px;
    }
  `,
  group: css`
    background: ${color.divider};
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid ${color.border};
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  headIcon: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r6}px;
    background: ${gradient.aiAgent};
    display: grid;
    place-items: center;
  `,
  badge: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.violetInk};
    background: ${color.violetBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
  `,
  close: css`
    margin-left: auto;
    display: none;
    width: ${layout.touch}px;
    height: ${layout.touch}px;
    border: none;
    background: none;
    cursor: pointer;
    @media (max-width: 1180px) {
      display: grid;
      place-items: center;
    }
  `,
  tabs: css`
    display: flex;
    border-bottom: 1px solid ${color.border};
    padding: 0 8px;
    gap: 2px;
  `,
  tab: css`
    padding: 12px 8px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    color: ${color.text3};
    border-bottom: 2px solid transparent;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    color: ${color.brand};
    border-bottom-color: ${color.brand};
  `,
  scroll: css`
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    background: ${color.bg};
  `,
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 12px;
    margin-bottom: 12px;
  `,
  cardHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  link: css`
    margin-left: auto;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.brandInk};
    cursor: pointer;
    border: none;
    background: none;
    font-family: inherit;
    padding: 0;
    &:hover {
      text-decoration: underline;
    }
  `,
  chip: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    border-radius: ${radius.r20}px;
    padding: 2px 8px;
  `,
  chipEnd: css`
    margin-left: auto;
  `,
  hint: css`
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    line-height: 1.5;
    color: ${color.text3};
  `,
  hintLabel: css`
    color: ${color.brandInk};
  `,
  small: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    margin-top: 4px;
  `,
  ok: css`
    color: ${color.brandInk};
  `,
  row: css`
    display: flex;
    gap: 16px;
    align-items: center;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-top: 1px solid ${color.divider};
    color: ${color.text3};
    & b {
      color: ${color.text};
    }
  `,
  ops: css`
    display: flex;
    gap: 4px;
    padding: 8px 12px 0;
    background: ${color.surface};
    flex-wrap: wrap;
  `,
  op: css`
    flex: 1 1 auto;
    height: 32px;
    border-radius: ${radius.r8}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  foot: css`
    display: flex;
    gap: 6px;
    padding: 8px 12px;
    background: ${color.surface};
    border-top: 1px solid ${color.border};
  `,
  footBtn: css`
    flex: 1;
    height: 38px;
    border-radius: ${radius.r8}px;
    border: none;
    font-weight: ${font.weight.bold};
    font-size: ${font.scale.s14}px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    cursor: pointer;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  tl: css`
    display: flex;
    gap: 8px;
    position: relative;
    padding-bottom: 12px;
    &:last-child {
      padding-bottom: 0;
    }
    &:not(:last-child)::before {
      content: '';
      position: absolute;
      left: 12px;
      top: 24px;
      bottom: 0;
      width: 1.5px;
      background: ${color.divider};
    }
  `,
  tlDot: css`
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    z-index: 1;
  `,
  tlWhen: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  tlText: css`
    font-size: ${font.scale.s14}px;
    line-height: 1.45;
    color: ${color.text};
  `,
}));
