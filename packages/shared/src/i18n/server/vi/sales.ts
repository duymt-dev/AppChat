// Chữ báo giá phía server — tiếng Việt (nguồn): tin gửi khách kèm link xem, gợi ý một dòng ở cột AI (luật theo trạng thái / hạn),
// kết quả mẫu của panel Trợ lý AI · Báo giá (luật trên dữ liệu thật, không gọi LLM), tên tệp PDF.
export const sales = {
  quote: {
    message: 'Kính gửi {customer}, {business} gửi báo giá {code} (lần {version}) — tổng {total}, hiệu lực đến {valid_until}. Xem chi tiết: {link}',
    extended: 'Báo giá {code} được gia hạn hiệu lực đến {valid_until}. Xem lại: {link}',
    pdfName: 'Bao-gia-{code}-L{version}.pdf',
    hint: {
      needApproval: 'Vượt ngưỡng — gửi duyệt trước khi gửi khách',
      draft: 'Hoàn thiện dòng hàng & gửi khách',
      pending: 'Đang chờ duyệt nội bộ',
      approved: 'Đã duyệt — gửi khách ngay',
      expiring: 'Còn {n} ngày hiệu lực — nhắc khách chốt',
      viewed: 'Khách đã xem — gọi tư vấn để chốt',
      sent: 'Theo dõi phản hồi của khách',
      revision: 'Khách xin sửa — đang soạn bản mới',
      accepted: 'Đã chốt — chuyển hợp đồng / đơn hàng',
      rejected: 'Ghi nhận lý do, chăm sóc lại sau',
      expired: 'Hết hạn — gia hạn hoặc tạo bản mới',
    },
    runs: {
      sugg: '{count} báo giá đang mở, tổng {total}. Báo giá lớn nhất: {top}. Ưu tiên chốt các báo giá khách đã xem.',
      suggEmpty: 'Chưa có báo giá đang mở để gợi ý.',
      followup: '{count} báo giá đã gửi chưa có phản hồi quá 3 ngày{list}. Nên nhắn nhắc khách kèm ưu đãi nếu chốt trong 48 giờ.',
      followupEmpty: 'Không có báo giá nào chờ phản hồi quá 3 ngày.',
      analyze: 'Tỉ lệ chốt {rate} ({accepted}/{decided} báo giá đã có kết quả). Từ chối: {rejected} · hết hạn: {expired}. Báo giá hết hạn nhiều thì nên nhắc sớm hơn.',
      analyzeEmpty: 'Chưa có báo giá nào có kết quả để phân tích.',
    },
  },
} as const;
