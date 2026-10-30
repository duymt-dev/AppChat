// Chữ thông báo phía server — tiếng Việt (nguồn). Tham số `{x}` thay bằng giá trị đã escape khi render email.
export const notify = {
  kind: {
    msg_assigned: { title: 'Hội thoại mới được gán cho bạn: {contact}', label: 'Tin mới được gán cho tôi' },
    msg_mention: { title: '{actor} nhắc đến bạn trong hội thoại {contact}', label: 'Nhắc đến tôi trong hội thoại' },
    msg_vip: { title: 'Tin mới từ khách ưu tiên {contact}', label: 'Tin từ VIP / khách ưu tiên' },
    sla_warn: { title: '{count} ticket sắp quá hạn SLA', label: 'SLA sắp vi phạm' },
    ai_review: { title: '{agent} cần bạn duyệt trước khi gửi', label: 'AI cần duyệt trước khi gửi' },
    ai_escalate: { title: '{agent} chuyển hội thoại {contact} sang người', label: 'AI chuyển sang người' },
    ai_budget: { title: 'AI đã dùng {percent}% ngân sách credit', label: 'AI vượt ngân sách' },
    channel_down: { title: 'Kênh {channel} bị ngắt kết nối', label: 'Kênh bị ngắt kết nối' },
    billing_invoice: { title: 'Hoá đơn gói mới {code}', label: 'Gói & ví — hoá đơn mới' },
  },
  mail: {
    subject: '[{workspace}] {title}',
    open: 'Xem trên AppChat',
    footer: 'Bạn nhận email này vì đã bật email cho "{label}". Đổi tại Cài đặt › Thông báo.',
  },
} as const;
