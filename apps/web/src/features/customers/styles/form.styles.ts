// Ô nhập / nút của modal Khách hàng — prototype L2600–2626 (input 40px · nhãn 13px) + L5189–5228 (form tạo 2 cột theo nhóm).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useFormStyles = createStyles(({ css, responsive }) => ({
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  wide: css`
    grid-column: 1 / -1;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
  `,
  label: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  input: css`
    width: 100%;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-family: inherit;
    font-size: ${font.scale.s15}px;
    color: ${color.text};
    outline: none;
    background: ${color.surface};
    &:focus {
      border-color: ${color.brand};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  inputSm: css`
    height: 38px;
    font-size: ${font.scale.s14}px;
  `,
  area: css`
    height: 76px;
    padding: 8px 12px;
    resize: none;
    line-height: 1.5;
  `,
  section: css`
    margin-bottom: 20px;
  `,
  sectionTitle: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  err: css`
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerLine};
    color: ${color.hotText};
    border-radius: ${radius.r8}px;
    padding: 8px 12px;
    font-size: ${font.scale.s13}px;
    margin-bottom: 12px;
  `,
  btn: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 40px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 16px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
    background: ${color.surface};
    font-family: inherit;
    white-space: nowrap;
    &:hover {
      background: ${color.brandBg};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  btnSm: css`
    height: 36px;
    padding: 0 12px;
  `,
  /** Chân modal "Kiểm trùng" / "Trường mở rộng" (prototype .chip 36px). */
  btnFoot: css`
    height: 36px;
  `,
  btnWide: css`
    padding: 0 20px;
  `,
  primary: css`
    background: ${color.brand};
    border-color: ${color.brand};
    color: ${color.white};
    font-weight: ${font.weight.bold};
    &:hover {
      background: ${color.brandHover};
    }
  `,
  owned: css`
    border: 1px solid ${color.alertLine};
    background: ${color.alertBg};
    border-radius: ${radius.r12}px;
    padding: 16px;
    margin-bottom: 16px;
  `,
  ownedTitle: css`
    font-size: ${font.scale.s15}px;
    font-weight: ${font.weight.heavy};
    color: ${color.text};
    margin-bottom: 4px;
  `,
  ownedBody: css`
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    line-height: 1.5;
    margin-bottom: 12px;
  `,
  row: css`
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  `,
  muted: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
}));
