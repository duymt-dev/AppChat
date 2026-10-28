// Modal "Kiểm tra trùng lặp" + "Trường thông tin mở rộng" — prototype L2626–2722.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const DUP_GRID = 'minmax(160px,1.3fr) minmax(170px,1.2fr) 150px 1fr';
const CF_GRID = '24px minmax(150px,1.4fr) 110px minmax(160px,1.5fr) 130px 78px 60px';

export const useDedupeStyles = createStyles(({ css, responsive }) => ({
  search: css`
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 8px 8px 8px 12px;
    margin-bottom: 16px;
  `,
  searchInput: css`
    flex: 1;
    border: none;
    outline: none;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
    background: transparent;
    min-width: 0;
  `,
  run: css`
    border: none;
    height: 36px;
    padding: 0 16px;
    border-radius: ${radius.r8}px;
    background: ${color.brand};
    color: ${color.white};
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    cursor: pointer;
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  none: css`
    border: 1px dashed ${color.disabled};
    border-radius: ${radius.r12}px;
    background: ${color.bg};
    padding: 24px;
    text-align: center;
    margin-bottom: 12px;
  `,
  noneIcon: css`
    width: 44px;
    height: 44px;
    border-radius: ${radius.r12}px;
    background: ${color.warnSoftBg};
    display: inline-grid;
    place-items: center;
    margin-bottom: 8px;
  `,
  noneTitle: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  noneBody: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    margin: 6px auto 0;
    line-height: 1.55;
    max-width: 440px;
  `,
  noneActs: css`
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 16px;
  `,
  summary: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  sum: css`
    border-radius: ${radius.r12}px;
    padding: 16px;
    border: 1px solid;
  `,
  sumLabel: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
  `,
  sumBig: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 4px;
  `,
  sumText: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    margin-top: 6px;
    line-height: 1.5;
  `,
  group: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    margin-bottom: 12px;
    overflow: hidden;
  `,
  groupHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    flex-wrap: wrap;
  `,
  pct: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  by: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    b {
      color: ${color.text2};
    }
  `,
  grow: css`
    flex: 1;
  `,
  rec: css`
    display: grid;
    grid-template-columns: ${DUP_GRID};
    gap: 12px;
    padding: 12px 16px;
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  `,
  recLine: css`
    border-bottom: 1px solid ${color.dividerSoft};
  `,
  recName: css`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  radio: css`
    width: 15px;
    height: 15px;
    border-radius: 50%;
    border: 2px solid ${color.checkLine};
    flex-shrink: 0;
  `,
  radioOn: css`
    border: 4px solid ${color.brand};
  `,
  email: css`
    font-size: ${font.scale.s14}px;
    color: ${color.info};
  `,
  phone: css`
    font-size: ${font.scale.s14}px;
    font-family: ${font.mono};
    color: ${color.text2};
  `,
  src: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  // trường mở rộng
  cfBar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 20px 6px;
  `,
  cfCount: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  cfBody: css`
    padding: 8px 20px 16px;
  `,
  cfTable: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: auto;
  `,
  cfHead: css`
    display: grid;
    grid-template-columns: ${CF_GRID};
    gap: 8px;
    padding: 12px;
    background: ${color.tabIdle};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.4px;
    color: ${color.text3};
    min-width: 700px;
  `,
  cfRow: css`
    display: grid;
    grid-template-columns: ${CF_GRID};
    gap: 8px;
    padding: 12px;
    align-items: center;
    border-bottom: 1px solid ${color.dividerSoft};
    min-width: 700px;
    &:hover {
      background: ${color.rowHover};
    }
  `,
  center: css`
    display: flex;
    justify-content: center;
    text-align: center;
  `,
  grab: css`
    color: ${color.grab};
    cursor: grab;
    font-size: ${font.scale.s15}px;
  `,
  cfLabel: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  kind: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
  `,
  opts: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.4;
  `,
  grp: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
  `,
  box: css`
    width: 18px;
    height: 18px;
    border-radius: ${radius.r4}px;
    display: grid;
    place-items: center;
    border: 1px solid ${color.checkLine};
    background: ${color.surface};
    cursor: pointer;
    padding: 0;
  `,
  boxOn: css`
    background: ${color.blue};
    border-color: ${color.blue};
  `,
  tip: css`
    margin-top: 12px;
    background: ${color.tipBg};
    border: 1px solid ${color.tipLine};
    border-radius: ${radius.r10}px;
    padding: 12px 16px;
    font-size: ${font.scale.s14}px;
    color: ${color.tipText};
    line-height: 1.55;
  `,
  code: css`
    font-family: ${font.mono};
    background: ${color.surface};
    border: 1px solid ${color.tipLine};
    border-radius: ${radius.r4}px;
    padding: 2px 4px;
  `,
}));
