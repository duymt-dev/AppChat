// Hộp trường dữ liệu — prototype L936–958: ô cao 42 bo 10, hàng 2 công tắc (bo 10, pad 12), dòng "Tuỳ chọn nâng cao" viền trên,
// lưới 2 cột nơi hiển thị (công tắc nhỏ), chip vai trò 32 (chọn: viền xanh nền xanh nhạt).
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useFieldModalStyles = createStyles(({ css, responsive }) => ({
  input: css`
    width: 100%;
    height: 42px;
    padding: 0 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
    &:disabled {
      background: ${color.bg};
      color: ${color.text3};
    }
    ${responsive.md} {
      height: ${layout.touch}px;
      font-size: ${font.scale.s16}px;
    }
  `,
  two: css`
    display: flex;
    gap: 8px;
    ${responsive.md} {
      flex-direction: column;
    }
  `,
  tog: css`
    flex: 1;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
  `,
  togL: css`
    flex: 1;
    font-size: ${font.scale.s14}px;
    color: ${color.text2};
    font-weight: ${font.weight.semibold};
  `,
  adv: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 0;
    border: none;
    border-top: 1px solid ${color.divider};
    background: transparent;
    cursor: pointer;
    font-family: inherit;
    width: 100%;
    text-align: left;
  `,
  advT: css`
    font-size: ${font.scale.s13}px;
    font-weight: ${font.weight.bold};
    color: ${color.brandInk};
  `,
  advS: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  grid2: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  place: css`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
  `,
  hint: css`
    font-weight: ${font.weight.medium};
    color: ${color.text4};
  `,
  roles: css`
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  `,
  role: css`
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s14}px;
    font-weight: ${font.weight.semibold};
    cursor: pointer;
    border: 1px solid ${color.border};
    background: ${color.surface};
    color: ${color.text3};
    font-family: inherit;
    ${responsive.md} {
      height: ${layout.touch}px;
    }
  `,
  roleOn: css`
    && {
      font-weight: ${font.weight.bold};
      border-color: ${color.brand};
      background: ${color.brandBg};
      color: ${color.brandInk};
    }
  `,
}));
