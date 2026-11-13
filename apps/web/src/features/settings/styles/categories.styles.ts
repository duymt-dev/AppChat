// Mục Danh mục ticket (TIP-034b §3) — màn mới không có trong prototype: khung thẻ như Chính sách bán hàng (padding 20, cột gap 16), mỗi
// nhãn một dòng (số thứ tự · ô nhập · lên / xuống / xoá), nhãn đầu gắn "Mặc định", dải cảnh báo xung đột, chân thẻ Nhập / Xuất / Lưu.
import { createStyles } from 'antd-style';
import { color, font, layout, radius } from '@appchat/ui';

export const useCategoriesStyles = createStyles(({ css, responsive }) => ({
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
  list: css`
    display: flex;
    flex-direction: column;
    gap: 8px;
  `,
  row: css`
    display: grid;
    grid-template-columns: 28px 1fr auto;
    align-items: center;
    gap: 8px;
  `,
  no: css`
    font-size: ${font.scale.s12}px;
    color: ${color.text4};
    text-align: right;
  `,
  tools: css`
    display: flex;
    gap: 4px;
  `,
  icon: css`
    width: 36px;
    height: 36px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    background: ${color.surface};
    color: ${color.text3};
    cursor: pointer;
    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
    ${responsive.md} {
      width: ${layout.touch}px;
      height: ${layout.touch}px;
    }
  `,
  badge: css`
    margin-left: 8px;
    padding: 0 8px;
    border-radius: ${radius.r8}px;
    background: ${color.brandBg};
    color: ${color.brandInk};
    font-size: ${font.scale.s12}px;
  `,
  err: css`
    margin-top: 4px;
    font-size: ${font.scale.s12}px;
    color: ${color.danger};
  `,
  note: css`
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    font-size: ${font.scale.s13}px;
    color: ${color.text3};
  `,
  warn: css`
    padding: 12px;
    border-radius: ${radius.r8}px;
    background: ${color.warnBg};
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
  `,
  foot: css`
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    flex-wrap: wrap;
  `,
  grow: css`
    flex: 1;
  `,
}));
