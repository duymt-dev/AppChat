// Mục Kênh kết nối — prototype L5893–5938: pill lọc (đen khi chọn), seg Danh sách / Dạng thẻ, bảng 2fr 1fr .9fr .8fr 1.2fr 80,
// lưới thẻ 4 cột (bo 16, nhãn nổi, logo 42 trắng, mô tả 3 dòng, chân nút viền).
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

const stat = `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.bold};
`;
const lBtn = `
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s13}px;
  font-weight: ${font.weight.bold};
  cursor: pointer;
  font-family: inherit;
`;

export const useChannelsStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  pills: css`
    display: flex;
    gap: 6px;
  `,
  pill: css`
    padding: 6px 12px;
    border-radius: ${radius.r16}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  pillOn: css`
    && {
      border-color: transparent;
      background: ${color.text};
      color: ${color.white};
      font-weight: ${font.weight.bold};
    }
  `,
  seg: css`
    display: flex;
    padding: 2px;
    background: ${color.lyRuleChip};
    border-radius: ${radius.r8}px;
    gap: 2px;
  `,
  segBtn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: ${radius.r6}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    font-family: inherit;
    background: transparent;
    color: ${color.text3};
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  segOn: css`
    && {
      background: ${color.surface};
      color: ${color.text};
      box-shadow: ${shadow.cardSoft};
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  lGrid: css`
    grid-template-columns: 2fr 1fr 0.9fr 0.8fr 1.2fr 80px;
  `,
  lTh: css`
    && {
      background: ${color.tabIdle};
      font-size: ${font.scale.s11}px;
      letter-spacing: 0.03em;
    }
  `,
  right: css`
    text-align: right;
  `,
  lWho: css`
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    ${responsive.md} {
      flex: 1 1 100%;
    }
  `,
  lIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-weight: ${font.weight.heavy};
    font-size: ${font.scale.s16}px;
    flex-shrink: 0;
  `,
  lName: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  lAcc: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  stOn: css`
    ${stat}
    color: ${color.brandInk};
  `,
  stOff: css`
    ${stat}
    color: ${color.text4};
  `,
  stDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
    background: currentColor;
  `,
  num: css`
    text-align: right;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  frt: css`
    text-align: right;
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
  `,
  ai: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.violet};
    background: ${color.aiPeekBg};
    border-radius: ${radius.r8}px;
    padding: 2px 8px;
  `,
  lAct: css`
    display: flex;
    justify-content: flex-end;
  `,
  btnManage: css`
    ${lBtn}
    border: 1px solid ${color.border};
    color: ${color.text};
    background: ${color.surface};
  `,
  btnConnect: css`
    ${lBtn}
    border: 1px solid ${color.brand};
    color: ${color.white};
    background: ${color.brand};
  `,
  btnSoon: css`
    ${lBtn}
    border: 1px solid ${color.border};
    color: ${color.text4};
    background: ${color.bg};
    cursor: default;
  `,
  groups: css`
    display: flex;
    flex-direction: column;
    gap: 24px;
  `,
  gT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.forest};
    margin-bottom: 12px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 16px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    position: relative;
    margin-top: 12px;
    border: 1px solid ${color.dividerFaint};
    border-radius: ${radius.r16}px;
    padding: 16px 16px 12px;
    display: flex;
    flex-direction: column;
    min-height: 188px;
    box-shadow: ${shadow.cardSoft};
    box-sizing: border-box;
  `,
  badge: css`
    position: absolute;
    top: -12px;
    left: 12px;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    background: ${color.surface};
    padding: 2px 8px;
    border-radius: ${radius.r8}px;
    box-shadow: ${shadow.cardSoft};
  `,
  b_on: css`
    color: ${color.brandInk};
  `,
  b_pop: css`
    color: ${color.brandInk};
  `,
  b_beta: css`
    color: ${color.info};
  `,
  bDot: css`
    width: 7px;
    height: 7px;
    border-radius: ${radius.r4}px;
    background: ${color.okStrong};
  `,
  cHead: css`
    display: flex;
    align-items: flex-start;
    gap: 12px;
  `,
  cName: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.forest};
    line-height: 1.25;
  `,
  logo: css`
    width: 42px;
    height: 42px;
    border-radius: ${radius.r10}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    flex-shrink: 0;
    box-shadow: ${shadow.cardSoft};
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
  `,
  desc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    line-height: 1.5;
    margin-top: 8px;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  `,
  cFoot: css`
    border-top: 1px solid ${color.divider};
    margin-top: 12px;
    padding-top: 12px;
    display: flex;
    justify-content: flex-end;
  `,
  cBtn: css`
    display: inline-flex;
    align-items: center;
    height: 34px;
    padding: 0 16px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text2};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    &:disabled {
      color: ${color.text4};
      background: ${color.bg};
      cursor: default;
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  mInfo: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
  `,
  qr: css`
    align-self: center;
    width: 160px;
    height: 160px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    display: grid;
    place-items: center;
  `,
}));
