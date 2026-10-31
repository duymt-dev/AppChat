// Chữ thông báo phía server — tiếng Việt (nguồn). Tham số `{x}` thay bằng giá trị đã escape khi render email.
export const notify = {
  kind: {
    msg_assigned: { title: 'Hội thoại mới được gán cho bạn: {contact}', label: 'Tin mới được gán cho tôi' },
    msg_mention: { title: '{actor} nhắc đến bạn trong hội thoại {contact}', label: 'Nhắc đến tôi trong hội thoại' },
    msg_vip: { title: 'Tin mới từ khách ưu tiên {contact}', label: 'Tin từ VIP / khách ưu tiên' },
    crm_owner: { title: '{actor} chuyển khách {contact} cho bạn phụ trách', label: 'Khách được chuyển cho tôi' },
    // Biến thể theo `params.variant` (approved / rejected) — kết quả duyệt gửi người xin.
    crm_access: {
      title: '{actor} xin cùng phụ trách khách {contact}',
      approved: '{actor} đã đồng ý cho bạn cùng phụ trách khách {contact}',
      rejected: '{actor} đã từ chối yêu cầu chia sẻ khách {contact}',
      label: 'Xin chia sẻ khách / kết quả duyệt',
    },
    quote_approval: { title: '{actor} gửi duyệt báo giá {code} · {contact}', label: 'Báo giá chờ tôi duyệt' },
    quote_expiring: { title: 'Báo giá {code} · {contact} còn {n} ngày hiệu lực', label: 'Báo giá sắp hết hiệu lực' },
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
