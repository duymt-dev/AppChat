// Composer + popover (+ / mức AI / agent) — prototype L640–676, L1201–1222, L1294–1311.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius, shadow } from '@appchat/ui';

export const useComposerStyles = createStyles(({ css, responsive }) => ({
  box: css`
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r16}px;
    background: ${color.surface};
    box-shadow: ${shadow.composer};
    padding: 8px 12px;
    text-align: left;
  `,
  area: css`
    width: 100%;
    border: none;
    outline: none;
    resize: none;
    font-size: ${font.scale.s16}px;
    font-family: inherit;
    line-height: 1.5;
    background: transparent;
    color: ${color.text};
    max-height: 120px;
    display: block;
    &::placeholder {
      color: ${color.text3};
    }
  `,
  row: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
  `,
  icoBtn: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    border: none;
    background: transparent;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    padding: 0;
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.pillBg};
    border-radius: ${radius.pill}px;
    gap: 2px;
    margin-left: 2px;
  `,
  segBtn: css`
    height: 28px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    display: grid;
    place-items: center;
    border: none;
    font-family: inherit;
    background: transparent;
    color: ${color.text4};
    ${responsive.md} {
      height: 40px;
    }
  `,
  segOn: css`
    background: ${color.surface};
    color: ${color.text};
    box-shadow: ${shadow.segOn};
  `,
  agentChip: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    background: ${color.agentPickBg};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.agentPickText};
    cursor: pointer;
    margin-left: 6px;
    border: none;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
      max-width: 140px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
  grow: css`
    flex: 1;
  `,
  tierPill: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: ${radius.pill}px;
    background: ${color.pillBg};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    cursor: pointer;
    margin-right: 6px;
    border: none;
    font-family: inherit;
    white-space: nowrap;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  effort: css`
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    ${responsive.md} {
      display: none;
    }
  `,
  mic: css`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: ${color.brandBgSoft};
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.brandInk};
    padding: 0;
    ${responsive.md} {
      display: none;
    }
  `,
  send: css`
    width: 38px;
    height: 38px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    cursor: pointer;
    background: ${gradient.upgrade};
    flex-shrink: 0;
    border: none;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  veil: css`
    position: fixed;
    inset: 0;
    z-index: 1500;
  `,
  pop: css`
    position: fixed;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    box-shadow: ${shadow.asstPop};
    padding: 6px;
    z-index: 1501;
    font-family: ${font.family};
    line-height: normal;
    ${responsive.md} {
      left: 12px !important;
      right: 12px;
      width: auto !important;
    }
  `,
  popHead: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    color: ${color.text4};
    padding: 8px 12px 6px;
  `,
  popRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    cursor: pointer;
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
  popLabel: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    flex: 1;
  `,
  popKey: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  tierName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  tierDesc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  check: css`
    color: ${color.brand};
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s15}px;
  `,
  popSep: css`
    height: 1px;
    background: ${color.pillBg};
    margin: 4px 8px;
  `,
  popMeta: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
}));
