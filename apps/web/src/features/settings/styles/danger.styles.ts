// Hộp vùng nguy hiểm (TIP-041 P3): danh sách hệ quả xoá, ô "đã hiểu", lỗi trên form, trạng thái yêu cầu đóng băng, lưới xuất dữ liệu.
// Màn mới không có trong prototype (loại M — D21): dựng trên khung FormModal + token.
import { createStyles } from 'antd-style';
import { color, font, radius } from '@appchat/ui';

export const useDangerStyles = createStyles(({ css }) => ({
  list: css`
    margin: 0;
    padding: 12px 12px 12px 28px;
    background: ${color.dangerSoftBg};
    border: 1px solid ${color.dangerBg};
    border-radius: ${radius.r12}px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    display: flex;
    flex-direction: column;
    gap: 6px;
  `,
  ack: css`
    display: flex;
    align-items: flex-start;
    gap: 8px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
    cursor: pointer;
  `,
  err: css`
    font-size: ${font.scale.s13}px;
    color: ${color.dangerStrong};
  `,
  status: css`
    padding: 8px 12px;
    border-radius: ${radius.r8}px;
    background: ${color.bg};
    border: 1px solid ${color.border};
    font-size: ${font.scale.s13}px;
    color: ${color.text2};
  `,
  grid: css`
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  `,
  item: css`
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 12px;
    border: 1px solid ${color.border};
    border-radius: ${radius.r8}px;
    font-size: ${font.scale.s13}px;
    color: ${color.text};
  `,
}));
