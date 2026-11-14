// Gói & thanh toán — prototype L5948–5987: thẻ gradient xanh đậm bo 16 (GÓI HIỆN TẠI, AppChat + tên gói xanh mint, pill hiệu lực,
// nút Gia hạn 38), lưới 5 chỉ số (thanh 4); bảng "Lịch sử hóa đơn": thanh lọc (tìm 34, trạng thái, từ → đến, đếm), lưới 7 cột, pill trạng thái.
import { createStyles } from 'antd-style';
import { color, font, gradient, layout, radius } from '@appchat/ui';

const COLS = '1.1fr 1.4fr 0.9fr 1fr 1fr 1fr 150px';
const ctl = `
  height: 34px;
  border: 1px solid ${color.border};
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s14}px;
  font-family: inherit;
  color: ${color.text2};
  background: ${color.surface};
  outline: none;
`;
const btn = `
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 30px;
  padding: 0 12px;
  border-radius: ${radius.r8}px;
  font-size: ${font.scale.s13}px;
  font-family: inherit;
  cursor: pointer;
  background: ${color.surface};
`;

export const useBillingStyles = createStyles(({ css, responsive }) => ({
  hero: css`
    background: ${gradient.billHero};
    border-radius: ${radius.r16}px;
    padding: 20px 24px;
    color: ${color.white};
    margin-bottom: 20px;
    ${responsive.md} {
      padding: 16px;
    }
  `,
  top: css`
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  eyebrow: css`
    font-size: ${font.scale.s12}px;
    color: ${color.billMuted3};
    letter-spacing: 0.08em;
  `,
  name: css`
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
    font-size: ${font.scale.s28}px;
    font-weight: ${font.weight.heavy};
    ${responsive.md} {
      font-size: ${font.scale.s22}px;
    }
  `,
  mint: css`
    color: ${color.billMint};
  `,
  live: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.billMint};
    background: ${color.billMintBg};
    border-radius: ${radius.r10}px;
    padding: 2px 8px;
    margin-left: 4px;
    &::before {
      content: '●';
      font-size: ${font.scale.s10}px;
    }
  `,
  renew: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    height: 36px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  stats: css`
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    ${responsive.md} {
      grid-template-columns: repeat(2, 1fr);
    }
  `,
  l: css`
    font-size: ${font.scale.s12}px;
    color: ${color.billMuted};
    font-weight: ${font.weight.semibold};
  `,
  v: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    margin-top: 4px;
    letter-spacing: -0.01em;
  `,
  bar: css`
    height: 4px;
    border-radius: ${radius.r4}px;
    background: ${color.billBar};
    margin-top: 6px;
    overflow: hidden;
    span {
      display: block;
      height: 100%;
      background: ${color.brand};
      border-radius: ${radius.r4}px;
    }
  `,
  sub: css`
    font-size: ${font.scale.s12}px;
    color: ${color.billMuted2};
    margin-top: 4px;
  `,
  table: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
  `,
  bar2: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    flex-wrap: wrap;
  `,
  tt: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  search: css`
    position: relative;
    flex: 1;
    min-width: 180px;
    max-width: 280px;
    svg {
      position: absolute;
      left: 12px;
      top: 11px;
    }
    input {
      ${ctl}
      width: 100%;
      padding-left: 32px;
    }
    ${responsive.md} {
      max-width: none;
      input {
        height: ${layout.touch}px;
      }
    }
  `,
  select: css`
    ${ctl}
    padding: 0 8px;
    cursor: pointer;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  date: css`
    ${ctl}
    width: 120px;
    padding: 0 8px;
    ${responsive.md} {
      height: ${layout.touch}px;
      flex: 1;
    }
  `,
  arrow: css`
    color: ${color.text4};
  `,
  count: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
    margin-left: auto;
  `,
  th: css`
    display: grid;
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 12px 16px;
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
    grid-template-columns: ${COLS};
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    align-items: center;
    ${responsive.md} {
      grid-template-columns: 1fr auto;
      gap: 4px 12px;
      & > :nth-child(3),
      & > :nth-child(5) {
        display: none;
      }
    }
  `,
  r: css`
    text-align: right;
  `,
  code: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    font-family: ${font.mono};
  `,
  pkg: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `,
  dt: css`
    font-size: ${font.scale.s13}px;
    color: ${color.blue};
  `,
  amt: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    text-align: right;
  `,
  method: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  st: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    padding: 2px 8px;
    border-radius: ${radius.r12}px;
    white-space: nowrap;
  `,
  acts: css`
    display: flex;
    justify-content: flex-end;
    gap: 6px;
  `,
  pay: css`
    ${btn}
    border: 1px solid ${color.brand};
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  view: css`
    ${btn}
    border: 1px solid ${color.border};
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
}));
