// Mẫu chứng từ (D30 — màn mới, không có trong prototype; prototype-parity §2 "đúng token và pattern"): theo khung các mục Cài đặt —
// hàng nút (Tạo mẫu / Tải DOCX), chip loại như "Kênh kết nối", bảng lưới như Thẻ & nhãn; badge nguồn (Soạn trong app / DOCX), mặc định.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

const COLS = '2fr 1.1fr 1fr 0.6fr 1.2fr 110px 44px';

export const useDocTplStyles = createStyles(({ css, responsive }) => ({
  bar: css`
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    flex-wrap: wrap;
  `,
  chips: css`
    display: flex;
    gap: 6px;
    flex: 1;
    min-width: 0;
    overflow-x: auto;
    button {
      white-space: nowrap;
      height: 34px;
      padding: 0 12px;
      border-radius: ${radius.r8}px;
      border: 1px solid ${color.border};
      background: ${color.surface};
      color: ${color.text3};
      font-size: ${font.scale.s13}px;
      font-weight: ${font.weight.semibold};
      font-family: inherit;
      cursor: pointer;
      ${responsive.md} {
        height: ${layout.touch}px;
      }
    }
    button[aria-pressed='true'] {
      border-color: ${color.brand};
      background: ${color.brandBg};
      color: ${color.brandInk};
      font-weight: ${font.weight.bold};
    }
  `,
  grid: css`
    grid-template-columns: ${COLS};
    ${responsive.md} {
      grid-template-columns: 1fr auto 44px;
      & > :nth-child(2),
      & > :nth-child(4),
      & > :nth-child(5) {
        display: none;
      }
    }
  `,
  name: css`
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.bold};
    color: ${color.text};
    span {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `,
  ic: css`
    width: 32px;
    height: 32px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    display: grid;
    place-items: center;
    flex-shrink: 0;
  `,
  file: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    font-weight: ${font.weight.regular};
    font-family: ${font.mono};
  `,
  kind: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  src: css`
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    white-space: nowrap;
  `,
  rich: css`
    background: ${color.violetChip};
    color: ${color.violet};
  `,
  docx: css`
    background: ${color.infoBg};
    color: ${color.info};
  `,
  ver: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
    font-family: ${font.mono};
  `,
  by: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  def: css`
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
    background: ${color.bonusBg};
    border-radius: ${radius.r10}px;
    padding: 2px 8px;
    white-space: nowrap;
  `,
  setDef: css`
    border: none;
    background: transparent;
    color: ${color.blue};
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    font-family: inherit;
    cursor: pointer;
    padding: 0;
    text-align: left;
    ${responsive.md} {
      min-height: ${layout.touch}px;
    }
  `,
  note: css`
    display: flex;
    gap: 8px;
    align-items: flex-start;
    margin-top: 12px;
    padding: 12px 16px;
    background: ${color.alertBg};
    border: 1px solid ${color.alertLine};
    border-radius: ${radius.r12}px;
    font-size: ${font.scale.s13}px;
    color: ${color.alertText};
    line-height: 1.5;
    svg {
      flex-shrink: 0;
      margin-top: 2px;
    }
  `,
}));
