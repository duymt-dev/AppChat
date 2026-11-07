// Mục Chính sách bán hàng (TIP-032b P1) — màn mới không có trong prototype: khung thẻ theo mục Ngôn ngữ & vùng (prototype L6271, padding
// 20, cột gap 16), hai ô số cạnh nhau, dòng ghi chú trần agent, nút Lưu / Hoàn lại cuối thẻ.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useSalesPolicyStyles = createStyles(({ css, responsive }) => ({
  box: css`
    background: ${color.surface};
    border: 1px solid ${color.border};
    border-radius: ${radius.r12}px;
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    ${responsive.md} {
      padding: 12px;
    }
  `,
  two: css`
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    ${responsive.md} {
      grid-template-columns: 1fr;
    }
  `,
  hint: css`
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
  `,
  note: css`
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  foot: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  `,
}));
