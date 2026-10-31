// Chữ phía server của domain AI (TIP-021) — tiếng Việt (nguồn): tên agent mặc định, lý do / tiêu đề hàng chờ duyệt.
export const ai = {
  agent: { unnamed: 'Agent mới', copy: '{name} (bản sao)', assistant: 'Trợ lý AI' },
  approval: {
    title: '{action}',
    summary: '{agent} đề nghị chạy "{action}"',
    reason: {
      send: 'Gửi ra ngoài — cần duyệt trước khi gửi',
      money: 'Thao tác tiền — luôn cần người duyệt',
      delete: 'Xoá dữ liệu — luôn cần người duyệt',
      write: 'Agent không đủ tin cậy — cần người duyệt',
      read: 'Cần người duyệt',
      config: 'Đổi cấu hình — cần người duyệt',
    },
    rejected: 'Người duyệt đã từ chối thao tác này',
    expired: 'Hết hạn duyệt',
  },
};
