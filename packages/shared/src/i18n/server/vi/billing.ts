// Chữ lịch sử ví (credit_ledger) phía server — tiếng Việt (nguồn). `note` / `source` của dòng ledger là khoá ở đây.
export const billing = {
  ledger: {
    trial_grant: 'Cấp credit dùng thử · gói {plan}',
    plan_grant: 'Cấp credit gói {plan}',
    plan_expire: 'Hết hạn credit gói kỳ trước',
    plan_upgrade: 'Credit chênh khi nâng lên gói {plan}',
    topup: 'Nạp {credits} credit',
    ai_usage: 'AI · {tokens} token',
    adjust: 'Điều chỉnh credit',
    refund: 'Hoàn credit',
  },
  /** Mô tả dòng hoá đơn gói AppChat (`GET /v1/billing/invoices` — TIP-010). */
  invoice: {
    plan_month: 'Gói {plan} · 1 tháng',
    plan_year: 'Gói {plan} · 12 tháng',
    credits: 'Nạp {credits} credit',
    addon_user: 'Mua thêm 1 người dùng',
    addon_channel: 'Mua thêm 1 kênh kết nối',
  },
  /** PDF đề nghị thanh toán gói AppChat (TIP-039, COMMERCE Q2) — chứng từ nền tảng, không phải hoá đơn GTGT. */
  pdf: {
    title: 'Đề nghị thanh toán',
    code: 'Số',
    created: 'Ngày lập',
    seller: 'Bên bán',
    buyer: 'Bên mua (thông tin xuất hoá đơn)',
    taxCode: 'MST',
    address: 'Địa chỉ',
    email: 'Email nhận hoá đơn',
    item: 'Nội dung',
    period: 'Kỳ áp dụng',
    amount: 'Số tiền (VND)',
    total: 'Tổng cộng',
    status: 'Trạng thái',
    paidAt: 'Ngày thanh toán',
    transfer: 'Nội dung chuyển khoản',
    bank: 'Tài khoản nhận',
    vatManual: 'Hoá đơn GTGT (nếu cần) do đội vận hành AppChat xuất theo thông tin bên mua ở trên.',
    st: { pending: 'Chờ thanh toán', pending_review: 'Đang xác minh', paid: 'Đã thanh toán', expired: 'Hết hạn', cancelled: 'Đã huỷ' },
    upgrade: 'Nâng gói {from} → {to} (phần kỳ còn lại)',
  },
  source: { plan: 'Gói', ai: 'AI', assistant: 'Trợ lý AI', inbox: 'Hộp thư', marketing: 'Marketing', qr: 'VietQR', bank: 'Chuyển khoản', admin: 'Quản trị' },
} as const;
