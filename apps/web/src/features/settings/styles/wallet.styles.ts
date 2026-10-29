// Ví AppChat — prototype L6464–6610: hàng đầu (thẻ số dư gradient flex 1.3 + thẻ phụ flex 1), tab tối "Nạp tiền / Lịch sử ví / Hoá đơn",
// tiêu đề khối 15, chip cửa hàng, thẻ gói credit (bo 12 pad 16), thẻ tài nguyên; bảng lịch sử lưới 5 cột (header 11 in hoa nền FAFBFB).
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const LEDGER = '1.1fr 2fr 0.8fr 1fr 1fr';

export const useWalletStyles = createStyles(({ css, responsive }) => ({
  top: css`
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  bal: css`
    flex: 1.3;
    background: ${gradient.walHero};
    border-radius: ${radius.r16}px;
    padding: 20px;
    color: ${color.white};
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.billMint};
    letter-spacing: 0.05em;
  `,
  amount: css`
    font-size: ${font.scale.s36}px;
    font-weight: ${font.weight.heavy};
    margin: 8px 0;
    letter-spacing: -0.02em;
    line-height: 1.25;
    span {
      font-size: ${font.scale.s18}px;
      font-weight: ${font.weight.semibold};
      color: ${color.billMuted2};
    }
  `,
  balS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.billMuted};
  `,
  topup: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    border-radius: ${radius.r10}px;
    padding: 0 16px;
    height: 36px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    margin-top: 16px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  side: css`
    flex: 1;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r16}px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    justify-content: center;
  `,
  sideRow: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  sT: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  sS: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-top: 2px;
    line-height: 1.5;
  `,
  note: css`
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.amberText};
    background: ${color.warnSoftBg};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    svg {
      flex-shrink: 0;
    }
  `,
  tabs: css`
    display: flex;
    gap: 6px;
    padding: 4px;
    background: ${color.pillBg};
    border-radius: ${radius.r10}px;
    margin-bottom: 16px;
    width: fit-content;
    max-width: 100%;
    overflow-x: auto;
    button {
      padding: 6px 16px;
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s14}px;
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
    }
    button[aria-selected='true'] {
      background: ${color.text};
      color: ${color.white};
      font-weight: ${font.weight.bold};
    }
  `,
  head: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
  `,
  h: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
  `,
  hint: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin: -4px 0 12px;
  `,
  block: css`
    margin-bottom: 20px;
  `,
  shop: css`
    display: flex;
    gap: 6px;
    margin: 4px 0 16px;
    overflow-x: auto;
    button {
      white-space: nowrap;
      padding: 8px 16px;
      border-radius: ${radius.r8}px;
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.semibold};
      cursor: pointer;
      border: 1px solid ${color.border};
      background: ${color.surface};
      color: ${color.text3};
      font-family: inherit;
      ${responsive.md} {
        min-height: ${layout.touch}px;
      }
    }
    button[aria-pressed='true'] {
      border-color: ${color.brand};
      background: ${color.brandBg};
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
  `,
  packs: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    margin-bottom: 20px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  pack: css`
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
  `,
  packHot: css`
    && {
      border-color: ${color.brand};
    }
  `,
  pRow: css`
    display: flex;
    align-items: baseline;
    gap: 6px;
  `,
  cr: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  unit: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  bonus: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.bonusBg};
    border-radius: ${radius.r6}px;
    padding: 2px 6px;
    margin-left: auto;
  `,
  approx: css`
    font-size: ${font.scale.s13}px;
    color: ${color.violet};
    font-weight: ${font.weight.semibold};
    margin-top: 4px;
  `,
  pFoot: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
  `,
  price: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandDeep};
  `,
  buy: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 28px;
    padding: 0 12px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  tHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
  `,
  tT: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
  `,
  select: css`
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-family: inherit;
    background: ${color.surface};
    padding: 0 8px;
    cursor: pointer;
    color: ${color.text2};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  th: css`
    display: grid;
    grid-template-columns: ${LEDGER};
    gap: 12px;
    padding: 8px 16px;
    background: ${color.auditHead};
    border-bottom: 1px solid ${color.divider};
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${color.text4};
    ${responsive.md} {
      display: none;
    }
  `,
  tr: css`
    display: grid;
    grid-template-columns: ${LEDGER};
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      & > :nth-child(1),
      & > :nth-child(4) {
        display: none;
      }
    }
  `,
  at: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    white-space: nowrap;
  `,
  desc: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  pill: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
  `,
  src: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  delta: css`
    text-align: right;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
  `,
}));
