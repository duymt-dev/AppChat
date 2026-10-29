// Drawer chi tiết sản phẩm (392px, nền xám) — prototype L5691–5749: đầu (icon, chip, tên, 2 chỉ số), 5 tab, khối thẻ.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useDetailStyles = createStyles(({ css, responsive }) => ({
  top: css`
    display: flex;
    gap: 12px;
    align-items: center;
    margin-bottom: 12px;
    padding-right: 32px;
  `,
  icon: css`
    width: 54px;
    height: 54px;
    border-radius: ${radius.r12}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  chips: css`
    display: flex;
    align-items: center;
    gap: 8px;
  `,
  cat: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
    background: ${color.pillBg};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  st: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  name: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 4px;
    letter-spacing: -0.01em;
  `,
  kpis: css`
    display: flex;
    gap: 8px;
  `,
  kpi: css`
    flex: 1;
    padding: 8px 12px;
    background: ${color.bg};
    border: 1px solid ${color.pillBg};
    border-radius: ${radius.r10}px;
  `,
  kpiL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  kpiV: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  green: css`
    color: ${color.brandDeep};
  `,
  body: css`
    padding: 4px 8px;
  `,
  card: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 16px;
    margin-bottom: 12px;
  `,
  cardFlush: css`
    padding: 6px 0;
  `,
  h: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
    margin-bottom: 12px;
  `,
  hFlush: css`
    padding: 8px 16px 6px;
    margin-bottom: 0;
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
    span {
      color: ${color.text3};
    }
    b {
      color: ${color.text};
      font-weight: ${font.weight.semibold};
      text-align: right;
      max-width: 60%;
    }
  `,
  bInk: css`
    b {
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
  `,
  chans: css`
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  `,
  chan: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 4px 12px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
  `,
  dot: css`
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: ${color.brand};
  `,
  acts: css`
    display: flex;
    gap: 8px;
  `,
  act: css`
    flex: 1;
    justify-content: center;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    border-radius: ${radius.r8}px;
    height: 40px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  actPrimary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
  `,
  file: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 16px;
    border-top: 1px solid ${color.divider};
  `,
  ext: css`
    width: 34px;
    height: 40px;
    border-radius: ${radius.r6}px;
    display: grid;
    place-items: center;
    color: ${color.white};
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  fName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  fMeta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  open: css`
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 8px;
    border-radius: ${radius.r6}px;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text2};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    flex-shrink: 0;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  upload: css`
    margin: 8px 16px;
    height: 34px;
    border: 1px dashed ${color.dashLine};
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: transparent;
    width: calc(100% - 32px);
    font-family: inherit;
  `,
  timeline: css`
    border-left: 2px solid ${color.border};
    padding-left: 16px;
    margin-left: 6px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  `,
  tlItem: css`
    position: relative;
  `,
  tlDot: css`
    position: absolute;
    left: -24px;
    top: 2px;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 2px solid ${color.white};
  `,
  tlT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  tlM: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  stats: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  `,
  statV: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
  `,
  buyer: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-top: 1px solid ${color.divider};
  `,
  avatar: css`
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: ${color.brand};
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  docRow: css`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 0;
    border: none;
    border-top: 1px solid ${color.divider};
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  docName: css`
    flex: 1;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
  `,
  docView: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  ai: css`
    display: flex;
    gap: 8px;
    padding: 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r10}px;
    margin-bottom: 8px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.55;
  `,
  aiSpark: css`
    color: ${color.brandInk};
    flex-shrink: 0;
  `,
  aiActs: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  aiAct: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
}));
