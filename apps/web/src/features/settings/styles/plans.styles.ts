// Thẻ gói + bảng so sánh — prototype L999–1018 (popup Nâng cấp: thẻ bo 16 pad 20, giá 28) và L6482–6499 (Ví: thẻ bo 12 pad 16, giá 22);
// nhãn "Phổ biến", "ĐANG DÙNG THỬ"; bảng so sánh lưới 1.6fr + 4×1fr, nhóm nền xanh nhạt in hoa thu gọn được; segment Cá nhân / Doanh nghiệp.
import { createStyles } from 'antd-style';
import { color, font, layout, radius, shadow } from '@appchat/ui';

const CMP = '1.6fr 1fr 1fr 1fr 1fr';

export const usePlanStyles = createStyles(({ css, responsive }) => ({
  grid: css`
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  card: css`
    background: ${color.surface};
    border: 1.5px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 16px;
    display: flex;
    flex-direction: column;
  `,
  big: css`
    border-radius: ${radius.r16}px;
    padding: 20px;
    box-shadow: ${shadow.planCard};
  `,
  hot: css`
    && {
      border-color: ${color.brand};
      box-shadow: ${shadow.planRing};
    }
  `,
  pop: css`
    align-self: flex-start;
    font-size: ${font.scale.s10}px;
    font-weight: ${font.weight.heavy};
    color: ${color.white};
    background: ${color.brand};
    border-radius: ${radius.r6}px;
    padding: 2px 8px;
    margin-bottom: 8px;
  `,
  popBig: css`
    font-size: ${font.scale.s11}px;
    border-radius: ${radius.r8}px;
  `,
  trialTag: css`
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.brandInkDeep};
    background: ${color.brandBg};
    border: 1px solid ${color.brandDash};
    border-radius: ${radius.r8}px;
    padding: 2px 8px;
    margin-bottom: 8px;
    &::before {
      content: '';
      width: 6px;
      height: 6px;
      border-radius: ${radius.r4}px;
      background: ${color.brand};
    }
  `,
  n: css`
    font-size: ${font.scale.s16}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  nBig: css`
    font-size: ${font.scale.s18}px;
  `,
  d: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    margin-top: 2px;
    line-height: 1.4;
    min-height: 30px;
  `,
  dBig: css`
    font-size: ${font.scale.s13}px;
    line-height: 1.45;
    min-height: 34px;
  `,
  price: css`
    margin: 12px 0 4px;
  `,
  p: css`
    font-size: ${font.scale.s22}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
  `,
  pBig: css`
    font-size: ${font.scale.s28}px;
    letter-spacing: -0.01em;
  `,
  u: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  uBig: css`
    font-size: ${font.scale.s13}px;
  `,
  feats: css`
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin: 12px 0;
    flex: 1;
  `,
  featsBig: css`
    gap: 8px;
  `,
  f: css`
    display: flex;
    align-items: flex-start;
    gap: 6px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  `,
  cta: css`
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 36px;
    border: 1px solid transparent;
    background: ${color.brand};
    color: ${color.white};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    font-family: inherit;
    cursor: pointer;
    &:disabled {
      cursor: default;
    }
  `,
  ctaBig: css`
    height: 42px;
    border-radius: ${radius.r10}px;
  `,
  ctaFree: css`
    && {
      background: ${color.surface};
      color: ${color.text3};
      border-color: ${color.border};
    }
  `,
  ctaTrial: css`
    && {
      background: ${color.brandBg};
      color: ${color.brandInk};
      border-color: ${color.brandDash};
    }
  `,
  seg: css`
    display: flex;
    gap: 4px;
    padding: 2px;
    background: ${color.pillBg};
    border-radius: ${radius.r10}px;
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
      ${responsive.md} {
        min-height: ${layout.touch}px;
      }
    }
    button[aria-pressed='true'] {
      background: ${color.text};
      color: ${color.white};
      font-weight: ${font.weight.bold};
    }
  `,
  segSm: css`
    border-radius: ${radius.r8}px;
    button {
      padding: 6px 12px;
    }
  `,
  cmp: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    overflow: hidden;
    ${responsive.md} {
      overflow-x: auto;
    }
  `,
  cmpHead: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.divider};
    ${responsive.md} {
      flex-wrap: wrap;
    }
  `,
  cmpT: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    flex: 1;
  `,
  chip: css`
    display: inline-flex;
    align-items: center;
    height: 30px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text};
    background: ${color.surface};
    cursor: pointer;
    font-family: inherit;
    margin-right: 8px;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  cmpRow: css`
    display: grid;
    grid-template-columns: ${CMP};
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid ${color.dividerSoft};
    align-items: center;
    ${responsive.md} {
      min-width: 640px;
    }
    & > span:not(:first-child) {
      text-align: center;
      font-size: ${font.scale.s13}px;
      color: ${color.text3};
    }
    & > span:nth-child(4) {
      color: ${color.text2};
      font-weight: ${font.weight.semibold};
    }
  `,
  cmpTh: css`
    && {
      background: ${color.auditHead};
      border-bottom-color: ${color.divider};
      font-size: ${font.scale.s12}px;
      font-weight: ${font.weight.heavy};
      color: ${color.text};
    }
    && > span:not(:first-child) {
      color: ${color.text};
      font-size: ${font.scale.s12}px;
      font-weight: ${font.weight.heavy};
    }
  `,
  cmpThL: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.bold};
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: ${color.text4};
  `,
  cmpFeat: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
  `,
  cmpG: css`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 16px;
    background: ${color.brandBgSoft};
    border: none;
    border-bottom: 1px solid ${color.cmpGroupLine};
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: ${color.brandInk};
    cursor: pointer;
    font-family: inherit;
    text-align: left;
    ${responsive.md} {
      min-width: 640px;
      min-height: ${layout.touch}px;
    }
  `,
  caret: css`
    width: 12px;
    font-size: ${font.scale.s12}px;
  `,
}));
