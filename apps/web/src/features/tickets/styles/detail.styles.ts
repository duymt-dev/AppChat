// Drawer chi tiết ticket — prototype L3276–3360 (400px): đầu (mã, ưu tiên, sao chép, tiêu đề, thời gian, 4 tab), banner AI, thân, ô soạn.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const lbl = `
  font-size: ${font.scale.s12}px;
  color: ${color.text4};
  margin-bottom: 4px;
  font-weight: ${font.weight.semibold};
`;
const h = `
  font-size: ${font.scale.s14}px;
  font-weight: ${font.weight.heavy};
  color: ${color.text};
`;

export const useTkDetailStyles = createStyles(({ css, responsive }) => ({
  head: css`
    margin: -4px -4px -8px;
    padding-right: 32px;
  `,
  idRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  code: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    font-family: ${font.mono};
    color: ${color.text};
  `,
  pr: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  dot: css`
    width: 5px;
    height: 5px;
    border-radius: ${radius.r4}px;
  `,
  grow: css`
    flex: 1;
  `,
  icon: css`
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
  `,
  title: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    line-height: 1.35;
    margin-bottom: 6px;
    color: ${color.text};
  `,
  times: css`
    display: flex;
    gap: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  tabs: css`
    display: flex;
    gap: 16px;
    margin-bottom: -16px;
  `,
  tab: css`
    padding: 0 0 8px;
    border: none;
    background: none;
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    font-weight: ${font.weight.medium};
    color: ${color.text3};
    border-bottom: 2px solid transparent;
    ${responsive.md} {
      min-height: ${layout.touch}px;
      padding: 0 4px;
    }
  `,
  tabOn: css`
    font-weight: ${font.weight.bold};
    color: ${color.brand};
    border-bottom-color: ${color.brand};
  `,
  aiWrap: css`
    margin: -12px -12px 12px;
  `,
  ai: css`
    padding: 8px 16px;
    border-bottom: 1px solid ${color.divider};
    display: flex;
    align-items: center;
    gap: 8px;
    background: ${gradient.tkAiBanner};
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
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  aiS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 30px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    flex-shrink: 0;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  body: css`
    padding: 4px;
  `,
  clock: css`
    border: 1px solid ${color.dividerSoft};
    border-radius: ${radius.r12}px;
    padding: 12px 16px;
    margin-bottom: 16px;
  `,
  clockH: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  `,
  clockL: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  clockV: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    font-family: ${font.mono};
  `,
  track: css`
    height: 7px;
    border-radius: ${radius.r4}px;
    background: ${color.surface};
    overflow: hidden;
    border: 1px solid ${color.dividerSoft};
    div {
      height: 100%;
      border-radius: ${radius.r4}px;
    }
  `,
  clockS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 6px;
  `,
  h: css`
    ${h}
    margin-bottom: 12px;
  `,
  h8: css`
    ${h}
    margin-bottom: 8px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
  `,
  lbl: css`
    ${lbl}
  `,
  val: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  who: css`
    display: flex;
    align-items: center;
    gap: 6px;
  `,
  desc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    line-height: 1.6;
    background: ${color.bg};
    border-radius: ${radius.r10}px;
    padding: 12px;
    margin-bottom: 16px;
    white-space: pre-wrap;
  `,
  macros: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  macro: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 12px;
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  macroIc: css`
    width: 28px;
    height: 28px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  macroL: css`
    flex: 1;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
}));
