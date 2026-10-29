// Hộp nạp credit (prototype L914–926: 640 bo 20, lưới 2×2 thẻ gói) + hộp QR thanh toán (L939–962: 720, QR 172 + bảng 5 dòng 16, nút 54)
// + màn "Thanh toán thành công". < md: toàn màn, lưới 1 cột.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow, z } from '@appchat/ui';

const big = `
  display: flex;
  align-items: center;
  justify-content: center;
  height: 54px;
  border-radius: ${radius.r12}px;
  font-size: ${font.scale.s18}px;
  font-weight: ${font.weight.bold};
  font-family: inherit;
  cursor: pointer;
`;

export const useBillingModalStyles = createStyles(({ css, responsive }) => ({
  veil: css`
    position: fixed;
    inset: 0;
    z-index: ${z.mkModal};
    background: ${color.creditVeil};
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 28px;
    ${responsive.md} {
      padding: 0;
    }
  `,
  box: css`
    width: 640px;
    max-width: 100%;
    max-height: 100%;
    overflow-y: auto;
    background: ${color.surface};
    border-radius: ${radius.r20}px;
    box-shadow: ${shadow.creditModal};
    font-family: ${font.family};
    ${responsive.md} {
      width: 100%;
      height: 100%;
      border-radius: 0;
    }
  `,
  wide: css`
    width: 720px;
  `,
  head: css`
    padding: 24px 32px 0;
    display: flex;
    align-items: flex-start;
    gap: 12px;
    ${responsive.md} {
      padding: 16px 16px 0;
    }
  `,
  headQr: css`
    padding: 28px 36px 0;
  `,
  grow: css`
    flex: 1;
    min-width: 0;
  `,
  t: css`
    font-size: ${font.scale.s24}px;
    font-weight: ${font.weight.heavy};
    color: ${color.textStrong};
    letter-spacing: -0.01em;
  `,
  tQr: css`
    font-size: ${font.scale.s28}px;
  `,
  s: css`
    font-size: ${font.scale.s15}px;
    color: ${color.text3};
    margin-top: 8px;
    line-height: 1.55;
  `,
  sQr: css`
    font-size: ${font.scale.s16}px;
    max-width: 560px;
  `,
  x: css`
    width: 34px;
    height: 34px;
    border-radius: ${radius.r8}px;
    display: grid;
    place-items: center;
    cursor: pointer;
    color: ${color.text4};
    border: none;
    background: transparent;
    flex-shrink: 0;
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  packs: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 20px 32px 28px;
    ${responsive.md} {
      grid-template-columns: 1fr;
      padding: 16px;
    }
  `,
  pack: css`
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    cursor: pointer;
    text-align: left;
    font-family: inherit;
    &:hover {
      border-color: ${color.brand};
      box-shadow: ${shadow.creditHover};
    }
  `,
  packHot: css`
    && {
      border-color: ${color.brand};
      box-shadow: ${shadow.planRing};
    }
  `,
  row: css`
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
    padding: 2px 8px;
    white-space: nowrap;
  `,
  approx: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 6px;
  `,
  foot: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 12px;
  `,
  price: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandDeep};
    white-space: nowrap;
  `,
  pick: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  qrWrap: css`
    display: flex;
    gap: 32px;
    padding: 24px 36px 4px;
    align-items: flex-start;
    ${responsive.md} {
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 16px;
    }
  `,
  qrCol: css`
    flex-shrink: 0;
    text-align: center;
  `,
  qrBox: css`
    padding: 12px;
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    .ant-qrcode {
      padding: 0;
      border: none;
    }
  `,
  qrCap: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text4};
    margin-top: 12px;
    font-weight: ${font.weight.medium};
  `,
  kv: css`
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    ${responsive.md} {
      width: 100%;
    }
  `,
  kvRow: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.dividerFaint};
    &:last-child {
      border-bottom: none;
    }
    span {
      font-size: ${font.scale.s16}px;
      color: ${color.qrLabel};
    }
    b {
      font-size: ${font.scale.s16}px;
      font-weight: ${font.weight.bold};
      color: ${color.text};
      text-align: right;
    }
  `,
  amt: css`
    && {
      font-size: ${font.scale.s24}px;
      font-weight: ${font.weight.heavy};
      color: ${color.brandDeep};
      letter-spacing: -0.01em;
    }
  `,
  mono: css`
    && {
      font-family: ${font.mono};
    }
  `,
  actions: css`
    display: flex;
    gap: 12px;
    padding: 8px 36px 28px;
    ${responsive.md} {
      padding: 8px 16px 16px;
    }
  `,
  paid: css`
    ${big}
    flex: 1;
    gap: 8px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
  `,
  close: css`
    ${big}
    padding: 0 28px;
    border: 1px solid ${color.qrCloseLine};
    color: ${color.text2};
    background: ${color.surface};
  `,
  done: css`
    text-align: center;
    padding: 40px 28px;
  `,
  doneIc: css`
    width: 68px;
    height: 68px;
    border-radius: ${radius.pill}px;
    background: ${color.bonusBg};
    display: grid;
    place-items: center;
    margin: 0 auto 16px;
  `,
  doneT: css`
    font-size: ${font.scale.s20}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  doneS: css`
    font-size: ${font.scale.s15}px;
    color: ${color.text3};
    margin-top: 8px;
    line-height: 1.6;
    b {
      color: ${color.brandInk};
    }
  `,
  doneBtn: css`
    display: inline-flex;
    align-items: center;
    height: 44px;
    padding: 0 24px;
    background: ${color.brand};
    color: ${color.white};
    border: none;
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    margin-top: 20px;
  `,
}));
