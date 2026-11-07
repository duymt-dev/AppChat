// Bố cục màn danh sách (D42): màn lấp đúng chiều cao vùng nội dung, tiêu đề / KPI / lọc đứng yên, khung bảng (DataTable) nhận phần còn lại
// và tự cuộn. Màn quá thấp (đầu màn + LIST_MIN_H > viewport) hoặc chế độ Kanban → cả màn cuộn như cũ. < md: cả màn cuộn (danh sách thẻ).

/** Cao tối thiểu khung bảng trước khi chuyển sang cuộn cả màn. */
export const LIST_MIN_H = 320;

/** Chèn vào `wrap` của màn danh sách: `${listPage(responsive.md)}`. */
export const listPage = (md: string) => `
  box-sizing: border-box;
  min-height: 100%;
  display: flex;
  flex-direction: column;
  ${md} {
    display: block;
    min-height: 0;
  }
`;
