// Drawer Quản lý kênh 2 cấp (B11) — prototype L870–966: danh sách tài khoản → chi tiết 6 khối.
import { createStyles } from 'antd-style';
import { color, font, radius, shadow } from '@appchat/ui';

export const useChannelManageStyles = createStyles(({ css }) => ({
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
  testRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
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
  stack: css`
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  sumGrid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 8px;
  `,
  sumCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    padding: 12px;
  `,
  sumL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  sumV: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  acctCard: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  acctHead: css`
    display: flex;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  acctHeadLbl: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
    flex: 1;
  `,
  acctAdd: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
  `,
  acctRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    cursor: pointer;
    background: none;
    border-left: none;
    border-right: none;
    border-top: none;
    width: 100%;
    text-align: left;
    font-family: inherit;
    &:hover {
      background: ${color.bg};
    }
  `,
  acctIni: css`
    width: 36px;
    height: 36px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    flex-shrink: 0;
  `,
  acctBody: css`
    flex: 1;
    min-width: 0;
  `,
  acctName: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  `,
  acctNameT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  acctMeta: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  acctAgent: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.violet};
  `,
  acctGo: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    white-space: nowrap;
    flex-shrink: 0;
  `,
  hSt: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
  `,
  hStGood: css`
    color: ${color.brandInk};
  `,
  hStBad: css`
    color: ${color.dangerDeep};
  `,
  hDot: css`
    width: 6px;
    height: 6px;
    border-radius: ${radius.r4}px;
    background: currentColor;
  `,
  back: css`
    align-self: flex-start;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    cursor: pointer;
    background: none;
    border: none;
    font-family: inherit;
    padding: 0;
  `,
  block: css`
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    background: ${color.surface};
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `,
  blockDanger: css`
    border-color: ${color.dangerSoftBg};
  `,
  blockT: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  blockTDanger: css`
    color: ${color.dangerDeep};
  `,
  infoGrid: css`
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 8px 16px;
    font-size: ${font.scale.s13}px;
  `,
  infoK: css`
    color: ${color.text4};
  `,
  infoV: css`
    color: ${color.text};
    font-weight: ${font.weight.semibold};
  `,
  statGrid: css`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
  `,
  statL: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  statV: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-top: 2px;
  `,
  syncRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-top: 1px solid ${color.divider};
  `,
  syncGrow: css`
    flex: 1;
    min-width: 0;
  `,
  historySelect: css`
    && {
      width: auto;
    }
  `,
  syncLbl: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  syncD: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  dangerRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
  `,
  dangerTitle: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  dangerTitleRed: css`
    color: ${color.dangerDeep};
  `,
  dangerD: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
}));
