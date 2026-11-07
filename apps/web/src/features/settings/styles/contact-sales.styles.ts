// Hộp "Liên hệ" gói Doanh nghiệp (TIP-039 pha 3) — ô nhập dùng chung FieldModal; thêm ô nhiều dòng, dòng đồng ý, dòng lỗi.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useContactSalesStyles = createStyles(({ css }) => ({
  sub: css`
    margin: 0;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  area: css`
    width: 100%;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r10}px;
    font-size: ${font.scale.s14}px;
    font-family: inherit;
    resize: vertical;
    outline: none;
    box-sizing: border-box;
    background: ${color.surface};
    color: ${color.text};
  `,
  consent: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
    cursor: pointer;
  `,
  err: css`
    font-size: ${font.scale.s13}px;
    color: ${color.danger};
  `,
}));
