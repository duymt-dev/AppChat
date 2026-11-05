// Chữ loyalty phía server — tiếng Việt (nguồn): dòng sổ điểm của thành viên (TIP-036), mô tả preview.
export const loyalty = {
  ledger: {
    earn: 'Tích điểm đơn {code}',
    redeem: 'Dùng điểm khi thanh toán {code}',
    adjust: 'Điều chỉnh điểm · {reason}',
    expire: 'Điểm hết hạn',
    reverse: 'Đảo điểm đơn {code}',
    restore: 'Trả lại điểm',
  },
  reasons: {
    missing_earn: 'Đơn hoàn tất chưa được cộng điểm',
    order_error: 'Sửa sai sót đơn hàng',
    compensation: 'Đền bù do sự cố dịch vụ',
    promotion: 'Ưu đãi chiến dịch riêng',
    refund_reverse: 'Thu hồi điểm do hoàn tiền',
    fraud: 'Thu hồi điểm cấp sai / gian lận',
    other: 'Lý do khác',
  },
  overview: {
    earn: '{vnd}đ = 1 điểm',
    mult: '{tier} × {m}',
    months: '{n} tháng',
    calc: { big_order: '+ 1.000 điểm', birthday: '+ 500 điểm', signup: '+ 200 điểm', referral: '+ 300 điểm', rating: '+ 100 điểm', package: '× 1,2 điểm' },
    exp: { m1: '1 tháng', m6: '6 tháng', m12: '12 tháng' },
  },
  tier: { member: 'Thành viên', silver: 'Bạc', gold: 'Vàng', diamond: 'Kim cương' },
};
