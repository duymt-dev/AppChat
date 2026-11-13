// Chữ ticket phía server — tiếng Việt (nguồn): gợi ý AI ở trang Ticket (theo luật), khảo sát CSAT khi đóng (Tickets spec), nhãn lý do
// đóng / danh mục cho dòng thời gian khách, tên nhóm "AI tự xử".
export const support = {
  ai: {
    overdue: 'Tóm tắt ticket quá hạn hôm nay',
    overdueHint: '{breach} ticket quá hạn SLA + {risk} sắp đến hạn · gợi ý xử lý ưu tiên',
    route: 'Phân loại & định tuyến ticket tồn',
    routeHint: '{n} ticket chưa có người phụ trách · gán theo danh mục & độ ưu tiên',
    report: 'Báo cáo SLA tuần này',
    reportHint: '{met}% đạt SLA · {ai} ticket AI tự xử · {breach} vi phạm',
  },
  csat: 'Chào {name}, yêu cầu {code} của anh/chị đã được xử lý xong. Anh/chị chấm giúp em mức hài lòng từ 1 đến 5 (5 = rất hài lòng) bằng cách trả lời một số nhé. Cảm ơn anh/chị!',
  reason: { resolved: 'đã giải quyết', duplicate: 'trùng ticket', withdrawn: 'khách rút yêu cầu', out_of_scope: 'ngoài phạm vi' },
  teamAi: 'AI tự xử',  // TIP-034b: tệp xuất bộ gợi ý danh mục ticket (tiêu đề cột khớp alias nhập lại).
  categories: { sheet: 'Danh mục ticket', file: 'danh-muc-ticket', position: 'Vị trí', label: 'Danh mục' },
  // TIP-034c §4.4: tệp kết quả sửa ticket hàng loạt (tập 038b chỉ xuất).
  bulkResults: { sheet: 'Kết quả hàng loạt', file: 'ket-qua-ticket-hang-loat', note: 'Kết quả từng ticket của một thao tác sửa hàng loạt — chỉ id, không nội dung ticket', cols: { ticket_id: 'Ticket ID', outcome: 'Kết quả', error_code: 'Mã lỗi', changed: 'Đã đổi', undo_state: 'Hoàn tác' } },
};
