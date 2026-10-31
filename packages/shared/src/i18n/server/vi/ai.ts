// Chữ phía server của domain AI (TIP-021) — tiếng Việt (nguồn): tên agent mặc định, lý do / tiêu đề hàng chờ duyệt.
export const ai = {
  agent: { unnamed: 'Agent mới', copy: '{name} (bản sao)', assistant: 'Trợ lý AI' },
  handoff: {
    needs_human: 'AI cần người xử lý: {detail}',
    asked_human: 'Khách muốn gặp nhân viên',
    banned_word: 'Chạm từ khoá cấm của AI Governance',
    complaint: 'Khách không hài lòng / khiếu nại — cần người xử lý',
    repeated: 'Khách hỏi lại cùng câu 3 lần',
    low_confidence: 'AI chưa đủ tự tin ({pct}% < ngưỡng {threshold}%)',
    no_reply: 'AI không soạn được câu trả lời',
    unreadable: 'AI trả lời sai định dạng',
    error: 'AI gặp lỗi khi trả lời ({detail})',
    credit: 'Hết credit AI — cần người trả lời',
    transfer_loop: 'Chuyển qua lại giữa các agent — cần người xử lý',
    approval_rejected: 'Người duyệt từ chối thao tác của AI',
  },
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
