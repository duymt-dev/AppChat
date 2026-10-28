// Drawer cấu hình tác vụ Cowork — prototype L1386–1421 (520px, nền #F7F8FA). < md: toàn màn.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

export const useDrawerStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    background: ${color.drawerVeil};
    z-index: 120;
    display: flex;
    justify-content: flex-end;
    ${responsive.md} {
      z-index: 900;
    }
  `,
  panel: css`
    width: ${layout.cwDrawer}px;
    max-width: 100%;
    height: 100%;
    background: ${color.drawerBg};
    box-shadow: ${shadow.cwDrawer};
    display: flex;
    flex-direction: column;
    font-family: ${font.family};
    line-height: normal;
    color: ${color.text};
  `,
  head: css`
    padding: 20px 24px;
    background: ${color.surface};
    border-bottom: 1px solid ${color.drawerLine};
    display: flex;
    align-items: center;
    gap: 12px;
    ${responsive.md} {
      padding: 12px 16px;
    }
  `,
  icon: css`
    width: 44px;
    height: 44px;
    border-radius: ${radius.r10}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  title: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
  `,
  sub: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  x: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text3};
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  tabs: css`
    padding: 12px 24px;
    background: ${color.surface};
    border-bottom: 1px solid ${color.drawerLine};
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    ${responsive.md} {
      padding: 8px 12px;
      flex-wrap: nowrap;
      overflow-x: auto;
    }
  `,
  tab: css`
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: transparent;
    color: ${color.text3};
    white-space: nowrap;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  tabOn: css`
    font-weight: ${font.weight.bold};
    background: ${color.brandBg};
    color: ${color.brandInk};
  `,
  body: css`
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    ${responsive.md} {
      padding: 16px 12px;
    }
  `,
  stack: css`
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
  tones: css`
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  `,
  tone: css`
    padding: 6px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    color: ${color.text3};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
  `,
  toneOn: css`
    background: ${color.brandBg};
    border-color: transparent;
    color: ${color.brandInk};
    font-weight: ${font.weight.bold};
  `,
  select: css`
    width: 100%;
    height: 40px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    background: ${color.surface};
    box-sizing: border-box;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  prompt: css`
    width: 100%;
    min-height: 150px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    box-sizing: border-box;
    resize: vertical;
    line-height: 1.6;
  `,
  hint: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-bottom: 12px;
  `,
  link: css`
    color: ${color.brandInk};
  `,
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  item: css`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px 16px;
  `,
  folder: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    background: ${color.dividerSoft};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  itemTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
  itemMeta: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  toolLabel: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
  `,
  sw: css`
    width: 42px;
    height: 24px;
    border-radius: ${radius.r12}px;
    position: relative;
    flex-shrink: 0;
    display: inline-block;
    & > span {
      position: absolute;
      top: 2px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: ${color.white};
      box-shadow: ${shadow.knob};
    }
  `,
  kpis: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  `,
  kpi: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px 16px;
  `,
  kpiLabel: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
  `,
  kpiVal: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
  `,
  logs: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  log: css`
    display: flex;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.logLine};
    align-items: center;
  `,
  logTime: css`
    font-size: ${font.scale.s11}px;
    color: ${color.text4};
    font-weight: ${font.weight.semibold};
    width: 42px;
    flex-shrink: 0;
  `,
  logDot: css`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  `,
  logText: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  foot: css`
    padding: 12px 24px;
    background: ${color.surface};
    border-top: 1px solid ${color.drawerLine};
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  primary: css`
    display: inline-flex;
    align-items: center;
    height: 38px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
