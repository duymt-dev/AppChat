// Mục Ngôn ngữ & vùng — prototype L6271: thẻ padding 20, cột gap 16; hàng cuối 2 cột.
import { createStyles } from 'antd-style';
import { color, radius } from '@appchat/ui';

export const useLocaleStyles = createStyles(({ css, responsive }) => ({
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
}));
