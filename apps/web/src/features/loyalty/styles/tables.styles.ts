// Bảng thành viên (34 1.4fr .85fr×4 .95fr 1fr 44) · cảnh báo rời bỏ (1.3fr .8fr 1fr 1.5fr .9fr 190) · quy tắc (34 1.6fr 1.5fr 1.5fr .85fr 128) — prototype L4437–4490.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const clip = `
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;
const head = `
  display: grid;
  gap: 8px;
  padding: 8px 16px;
  background: ${color.tabIdle};
  border-bottom: 1px solid ${color.divider};
  font-size: ${font.scale.s11}px;
  font-weight: ${font.weight.heavy};
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: ${color.text4};
`;
const row = `
  display: grid;
  gap: 8px;
  padding: 8px 16px;
  border-bottom: 1px solid ${color.divider};
  align-items: center;
`;
const M = '34px 1.4fr 0.85fr 0.85fr 0.85fr 0.85fr 0.95fr 1fr 44px';
const C = '1.3fr 0.8fr 1fr 1.5fr 0.9fr 190px';
const R = '34px 1.6fr 1.5fr 1.5fr 0.85fr 128px';

export const useTableStyles = createStyles(({ css, responsive }) => ({
  scroll: css`
    overflow-x: auto;
  `,
  mHead: css`
    ${head}
    grid-template-columns: ${M};
    min-width: 900px;
    ${responsive.md} {
      display: none;
    }
  `,
  mRow: css`
    ${row}
    grid-template-columns: ${M};
    min-width: 900px;
    cursor: pointer;
    &:hover {
      background: ${color.rowHover};
    }
    ${responsive.md} {
      min-width: 0;
      grid-template-columns: 1fr auto;
      padding: 12px;
      min-height: ${layout.touch}px;
    }
  `,
  cHead: css`
    ${head}
    gap: 12px;
    grid-template-columns: ${C};
    min-width: 900px;
  `,
  cRow: css`
    ${row}
    gap: 12px;
    padding: 12px 16px;
    grid-template-columns: ${C};
    min-width: 900px;
  `,
  rHead: css`
    ${head}
    gap: 12px;
    grid-template-columns: ${R};
    min-width: 900px;
  `,
  rRow: css`
    ${row}
    gap: 12px;
    padding: 12px 16px;
    grid-template-columns: ${R};
    min-width: 900px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
  end: css`
    text-align: right;
  `,
  hideM: css`
    ${responsive.md} {
      display: none !important;
    }
  `,
  idx: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text4};
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  av: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  min0: css`
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${clip}
  `,
  phone: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  mono: css`
    font-family: ${font.mono};
  `,
  tier: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    white-space: nowrap;
  `,
  pts: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.amberGold};
    text-align: right;
  `,
  num: css`
    font-size: ${font.scale.s14}px;
    text-align: right;
    color: ${color.text};
  `,
  numMuted: css`
    font-size: ${font.scale.s14}px;
    text-align: right;
    color: ${color.text3};
  `,
  money: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    text-align: right;
    color: ${color.text};
  `,
  st: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    white-space: nowrap;
  `,
  menu: css`
    display: flex;
    justify-content: flex-end;
  `,
  riskRow: css`
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  `,
  risk: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
  `,
  score: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  bar: css`
    height: 6px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    overflow: hidden;
    div {
      height: 100%;
      border-radius: ${radius.r4}px;
    }
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  acts: css`
    display: flex;
    gap: 6px;
    justify-content: flex-end;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r6}px;
    padding: 0 8px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    white-space: nowrap;
    font-family: inherit;
  `,
  chipAi: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  prio: css`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text4};
  `,
  ruleIc: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  ruleN: css`
    font-weight: ${font.weight.semibold};
    ${clip}
  `,
  ruleT: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    ${clip}
  `,
  conds: css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `,
  cond: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.semibold};
    padding: 2px 8px;
    border-radius: ${radius.r6}px;
    background: ${color.lyRuleChip};
    color: ${color.slate};
    white-space: nowrap;
  `,
  calc: css`
    font-weight: ${font.weight.semibold};
    font-family: ${font.mono};
    font-size: ${font.scale.s12}px;
    color: ${color.brandInk};
  `,
  stateRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    justify-content: flex-end;
  `,
  sw: css`
    width: 34px;
    height: 19px;
    border-radius: ${radius.r10}px;
    position: relative;
    flex-shrink: 0;
    span {
      position: absolute;
      top: 2px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: ${color.white};
    }
  `,
  swOn: css`
    left: 17px;
  `,
  bellIc: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    background: ${color.dangerSoftBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  soon: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    background: ${color.muteBg};
    color: ${color.text3};
    white-space: nowrap;
  `,
}));
