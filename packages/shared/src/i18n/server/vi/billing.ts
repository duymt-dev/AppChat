// Chữ lịch sử ví (credit_ledger) phía server — tiếng Việt (nguồn). `note` / `source` của dòng ledger là khoá ở đây.
export const billing = {
  ledger: {
    trial_grant: 'Cấp credit dùng thử · gói {plan}',
    plan_grant: 'Cấp credit gói {plan}',
    plan_expire: 'Hết hạn credit gói kỳ trước',
    topup: 'Nạp {credits} credit',
    ai_usage: 'AI · {tokens} token',
    adjust: 'Điều chỉnh credit',
    refund: 'Hoàn credit',
  },
  source: { plan: 'Gói', ai: 'AI', assistant: 'Trợ lý AI', inbox: 'Hộp thư', marketing: 'Marketing', qr: 'VietQR', bank: 'Chuyển khoản', admin: 'Quản trị' },
} as const;
