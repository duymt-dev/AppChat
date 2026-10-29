// Mục Trợ lý AI website — prototype L7184–7262: 4 KPI (icon 34 nền xám), lưới 1fr 360, thẻ cấu hình (nhãn 13 đậm, ô 38, hàng công tắc bo 10),
// khối AI gradient (chip 6/12 bo 8), mã nhúng nền tối mono 13. Mobile: KPI 2 cột, lưới 1 cột.
import { createStyles } from 'antd-style';
import { color, font, gradient, radius } from '@appchat/ui';

const chipBase = `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.semibold};
  cursor: pointer;
  font-family: inherit;
  border: 1px solid ${color.border};
  background: ${color.white};
  color: ${color.text3};
`;
const sub = `
  font-size: ${font.scale.s12}px;
  font-weight: ${font.weight.bold};
  color: ${color.text3};
  margin-bottom: 6px;
`;

export const useWidgetStyles = createStyles(({ css, responsive }) => ({
  kpis: css`
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      display: grid;
      grid-template-columns: 1fr 1fr;
    }
  `,
  kpi: css`
    flex: 1;
    background: ${color.white};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  kIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.lyRuleChip};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  kL: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-weight: ${font.weight.semibold};
    white-space: nowrap;
  `,
  kV: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    line-height: 1.2;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 16px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  cfg: css`
    background: ${color.white};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    align-self: start;
    min-width: 0;
  `,
  cfgT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 12px;
  `,
  lbl: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    margin-bottom: 8px;
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
    margin-bottom: 16px;
    ${responsive.md} {
      height: 44px;
      font-size: ${font.scale.s16}px;
    }
  `,
  toggle: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    margin-bottom: 8px;
  `,
  toggleLast: css`
    margin-bottom: 16px;
  `,
  tT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  tS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  actHead: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    & > div {
      margin-bottom: 0;
    }
  `,
  link: css`
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  acts: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  `,
  act: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
  `,
  iconBtn: css`
    width: 26px;
    height: 26px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    border: none;
    background: transparent;
    padding: 0;
    cursor: pointer;
    color: ${color.text3};
    flex-shrink: 0;
    &:hover {
      background: ${color.muteBg};
    }
  `,
  iconDanger: css`
    && {
      color: ${color.dangerDeep};
    }
  `,
  actDot: css`
    width: 9px;
    height: 9px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  aiBox: css`
    border: 1px solid ${color.wgAiLine};
    background: ${gradient.wgAiBox};
    border-radius: ${radius.r12}px;
    padding: 12px;
    margin-bottom: 16px;
  `,
  aiHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  aiIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    background: ${gradient.ai};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  aiT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  sLbl: css`
    ${sub}
  `,
  rowHead: css`
    display: flex;
    align-items: center;
    margin-bottom: 6px;
    & > div {
      margin-bottom: 0;
    }
  `,
  linkSm: css`
    border: none;
    background: transparent;
    padding: 0;
    font-family: inherit;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
  `,
  hint: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    line-height: 1.5;
    margin-bottom: 8px;
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 12px;
  `,
  modes: css`
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
  `,
  chip: css`
    ${chipBase}
  `,
  mode: css`
    flex: 1;
    justify-content: center;
    padding: 6px 8px;
  `,
  chipOn: css`
    && {
      font-weight: ${font.weight.bold};
      border-color: ${color.brand};
      background: ${color.brandBg};
      color: ${color.brandInk};
    }
  `,
  chipNew: css`
    ${chipBase}
    font-weight: ${font.weight.bold};
    border: 1px dashed ${color.brand};
    color: ${color.brandInk};
  `,
  tag: css`
    ${chipBase}
    padding: 4px 12px;
    font-size: ${font.scale.s12}px;
  `,
  tagViolet: css`
    && {
      border-color: ${color.violet};
      background: ${color.violetChip};
      color: ${color.violet};
    }
  `,
  tagBlue: css`
    && {
      border-color: ${color.blue};
      background: ${color.wgBlueBg};
      color: ${color.blue};
    }
  `,
  note: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    margin-bottom: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  range: css`
    width: 100%;
    accent-color: ${color.brand};
    margin: 0 0 12px;
  `,
  embedWrap: css`
    position: relative;
  `,
  embed: css`
    margin: 0;
    padding: 12px;
    background: ${color.codeBg};
    color: ${color.codeText};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s13}px;
    font-family: ${font.mono};
    overflow-x: auto;
    line-height: 1.6;
    white-space: pre-wrap;
  `,
  copy: css`
    position: absolute;
    top: 8px;
    right: 8px;
    border: none;
    background: ${color.mkGlass};
    color: ${color.white};
    border-radius: ${radius.r6}px;
    padding: 4px 8px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    cursor: pointer;
  `,
}));
