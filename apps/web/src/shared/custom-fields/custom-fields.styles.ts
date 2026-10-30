// Phần "Thông tin thêm" (form) + khối chi tiết của trường tuỳ biến (D56) — cùng thang ô nhập form tạo của prototype (38px · nhãn 13px).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCustomFieldStyles = createStyles(({ css, responsive }) => ({
  section: css`
    margin-top: 4px;
    margin-bottom: 20px;
  `,
  title: css`
    font-size: ${font.scale.s12}px;
    font-weight: ${font.weight.heavy};
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: ${color.text4};
    margin-bottom: 8px;
  `,
  grid: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  gridDense: css`
    gap: 8px;
  `,
  wide: css`
    grid-column: 1 / -1;
  `,
  field: css`
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  `,
  label: css`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.text3};
  `,
  ai: css`
    font-size: ${font.scale.s11}px;
    font-weight: ${font.weight.heavy};
    color: ${color.violetInk};
  `,
  input: css`
    width: 100%;
    height: 38px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    padding: 0 12px;
    font-family: inherit;
    font-size: ${font.scale.s14}px;
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
  inputDense: css`
    height: 36px;
    font-size: ${font.scale.s13}px;
  `,
  area: css`
    height: 76px;
    padding: 8px 12px;
    resize: none;
    line-height: 1.5;
  `,
  bad: css`
    border-color: ${color.danger};
  `,
  err: css`
    font-size: ${font.scale.s12}px;
    color: ${color.hotText};
  `,
  chips: css`
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  `,
  chip: css`
    height: 32px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.pill}px;
    background: ${color.surface};
    font-family: inherit;
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.semibold};
    color: ${color.text2};
    cursor: pointer;
  `,
  chipOn: css`
    border-color: ${color.brand};
    background: ${color.brandBg};
    color: ${color.brandDeep};
  `,
  /** Khối chi tiết (drawer / Hồ sơ 360°): nhãn trái · giá trị phải. */
  list: css`
    display: grid;
    grid-template-columns: minmax(120px, 40%) 1fr;
    gap: 8px 12px;
    font-size: ${font.scale.s13}px;
  `,
  dt: css`
    color: ${color.text3};
  `,
  dd: css`
    margin: 0;
    color: ${color.text};
    font-weight: ${font.weight.semibold};
    overflow-wrap: anywhere;
  `,
  muted: css`
    color: ${color.text4};
    font-weight: ${font.weight.regular};
  `,
  cell: css`
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
  `,
}));
