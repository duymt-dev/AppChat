// Thanh toán trong drawer Đề nghị thanh toán — prototype L5273–5289: tiến độ thu, danh sách khoản thu, VietQR, chứng từ liên quan.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useInvoicePayStyles = createStyles(({ css }) => ({
  barHead: css`
    display: flex;
    align-items: center;
    margin-bottom: 8px;
    span:last-child {
      margin-left: auto;
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.bold};
      color: ${color.text};
    }
  `,
  barL: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${color.text};
  `,
  bar: css`
    height: 8px;
    border-radius: ${radius.r4}px;
    background: ${color.divider};
    overflow: hidden;
    div {
      height: 100%;
      background: ${color.brand};
      border-radius: ${radius.r4}px;
    }
  `,
  barFoot: css`
    display: flex;
    justify-content: space-between;
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    margin-top: 8px;
    b {
      color: ${color.text};
    }
  `,
  leftV: css`
    b {
      color: ${color.hotText};
    }
  `,
  payRow: css`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid ${color.divider};
    &:last-child {
      border-bottom: none;
    }
  `,
  payIc: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  payAmt: css`
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
  `,
  payMeta: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
  `,
  empty: css`
    padding: 16px 0;
    text-align: center;
    font-size: ${font.scale.s13}px;
    color: ${color.text4};
  `,
  /** Nút gửi phiếu thu cho khách ở cuối dòng khoản thu (TIP-032b P2). */
  paySend: css`
    width: 32px;
    height: 32px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    display: grid;
    place-items: center;
    cursor: pointer;
    flex-shrink: 0;
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `,
  payCard: css`
    padding: 6px 16px;
  `,
  qr: css`
    display: flex;
    gap: 12px;
    align-items: flex-start;
    canvas,
    svg {
      display: block;
    }
  `,
  qrBox: css`
    padding: 6px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.white};
    flex-shrink: 0;
    .ant-qrcode {
      padding: 0;
      border: none;
    }
  `,
  qrKv: css`
    flex: 1;
    min-width: 0;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    display: flex;
    flex-direction: column;
    gap: 4px;
    b {
      display: block;
      font-size: ${font.scale.s13}px;
      color: ${color.text};
      word-break: break-all;
    }
  `,
  qrHint: css`
    margin-top: 8px;
    font-size: ${font.scale.s12}px;
    color: ${color.text3};
    line-height: 1.5;
  `,
  docRow: css`
    display: flex;
    align-items: center;
    width: 100%;
    padding: 8px 0;
    border: none;
    border-top: 1px solid ${color.divider};
    background: none;
    cursor: pointer;
    font-family: inherit;
    span:first-child {
      flex: 1;
      text-align: left;
      font-size: ${font.scale.s14}px;
      color: ${color.text};
    }
    span:last-child {
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.bold};
      color: ${color.brandInk};
    }
  `,
  legal: css`
    margin-top: 12px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: center;
    font-style: italic;
  `,
}));
