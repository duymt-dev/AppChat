// Drawer thành viên (400px) — prototype L4667–4733: đầu (avatar 52, tên, SĐT, hạng, 2 ô điểm), 5 tab, thân nền xám với các thẻ.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const card = `
  border: 1px solid ${color.border};
  border-radius: ${radius.r12}px;
  background: ${color.surface};
  padding: 16px;
  margin-bottom: 12px;
`;
const eyebrow = `
  font-size: ${font.scale.s12}px;
  font-weight: ${font.weight.heavy};
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${color.text};
`;

export const useDrawerStyles = createStyles(({ css, responsive }) => ({
  head: css`
    background: ${color.surface};
    border-bottom: 1px solid ${color.border};
    padding: 16px 20px;
    position: relative;
  `,
  x: css`
    position: absolute;
    top: 12px;
    right: 12px;
    width: 30px;
    height: 30px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    border: none;
    background: transparent;
    padding: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  who: css`
    display: flex;
    gap: 12px;
    align-items: center;
  `,
  av: css`
    width: 52px;
    height: 52px;
    border-radius: 50%;
    color: ${color.white};
    display: grid;
    place-items: center;
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    flex-shrink: 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  name: css`
    font-size: ${font.scale.s18}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  meta: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  `,
  phone: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    font-family: ${font.mono};
  `,
  tier: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  boxes: css`
    display: flex;
    gap: 8px;
    margin-top: 12px;
  `,
  curBox: css`
    flex: 1;
    padding: 8px 12px;
    background: ${color.lyNewBg};
    border: 1px solid ${color.lyNewLine};
    border-radius: ${radius.r10}px;
    div:first-of-type {
      font-size: ${font.scale.s12}px;
      color: ${color.amberText};
    }
    div:last-of-type {
      font-size: ${font.scale.s18}px;
      font-weight: ${font.weight.heavy};
      color: ${color.amberGold};
      margin-top: 2px;
    }
  `,
  accBox: css`
    flex: 1;
    padding: 8px 12px;
    background: ${color.bg};
    border: 1px solid ${color.pillBg};
    border-radius: ${radius.r10}px;
    div:first-of-type {
      font-size: ${font.scale.s12}px;
      color: ${color.text4};
    }
    div:last-of-type {
      font-size: ${font.scale.s18}px;
      font-weight: ${font.weight.heavy};
      color: ${color.text};
      margin-top: 2px;
    }
  `,
  tabs: css`
    display: flex;
    border-bottom: 1px solid ${color.border};
    padding: 0 16px;
    background: ${color.surface};
    overflow-x: auto;
  `,
  tab: css`
    padding: 12px 8px;
    font-size: ${font.scale.s14}px;
    white-space: nowrap;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: none;
    background: transparent;
    font-family: inherit;
    border-bottom: 2px solid transparent;
    color: ${color.text3};
  `,
  tabOn: css`
    font-weight: ${font.weight.bold};
    border-bottom-color: ${color.brand};
    color: ${color.brandInk};
  `,
  body: css`
    padding: 16px 20px;
    background: ${color.bg};
    min-height: 100%;
    box-sizing: border-box;
  `,
  card: css`
    ${card}
  `,
  eyebrowRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  eyebrow: css`
    ${eyebrow}
  `,
  maxTag: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.violet};
  `,
  text: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text3};
    line-height: 1.5;
    b {
      color: ${color.text};
    }
  `,
  upRow: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    b {
      color: ${color.text};
    }
  `,
  need: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  bar: css`
    height: 9px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    overflow: hidden;
    div {
      height: 100%;
      background: ${gradient.ai};
      border-radius: ${radius.r4}px;
    }
  `,
  kv: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.scale.s14}px;
    padding: 6px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-of-type {
      border-bottom: none;
    }
    span {
      color: ${color.text3};
    }
    b {
      font-weight: ${font.weight.semibold};
      color: ${color.text};
    }
  `,
  green: css`
    && {
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
  `,
  btns: css`
    display: flex;
    gap: 8px;
  `,
  btn: css`
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
  hist: css`
    display: flex;
    align-items: center;
    gap: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 12px;
    margin-bottom: 8px;
  `,
  histIc: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  histT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
  `,
  histS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
  `,
  histD: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    font-family: ${font.mono};
  `,
  ai: css`
    display: flex;
    gap: 8px;
    padding: 8px 12px;
    background: ${color.brandBg};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    line-height: 1.55;
    color: ${color.text2};
  `,
  act: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 0;
    border-top: 1px solid ${color.divider};
    cursor: pointer;
    font-size: ${font.scale.s14}px;
    color: ${color.text};
    width: 100%;
    border-left: none;
    border-right: none;
    border-bottom: none;
    background: none;
    text-align: left;
    font-family: inherit;
  `,
}));
