// Chữ gửi chứng từ cho khách (TIP-032b P2): xác nhận đơn, phiếu thu, link công khai. Gộp vào `sales.delivery`.
export const salesDelivery = {
  orderMessage: 'Kính gửi {customer}, {business} xác nhận đơn {code}: tổng {total}, đã thanh toán {paid}, còn lại {left}. Chi tiết trong tệp đính kèm.',
  receiptMessage: 'Kính gửi {customer}, {business} gửi phiếu thu {code}: đã nhận {amount} cho {invoice}. Cảm ơn quý khách!',
  link: 'Xem / tải chứng từ: {link}',
  orderPdfName: 'Xac-nhan-don-{code}.pdf',
  order: {
    title: 'XÁC NHẬN ĐƠN HÀNG {code}',
    date: 'Ngày',
    customer: 'Khách hàng',
    item: 'Sản phẩm / dịch vụ',
    qty: 'SL',
    price: 'Đơn giá',
    amount: 'Thành tiền',
    discount: 'Giảm giá',
    tax: 'Thuế',
    total: 'Tổng cộng',
    paid: 'Đã thanh toán',
    left: 'Còn lại',
    payStatus: 'Trạng thái thanh toán',
    pay: { unpaid: 'Chưa thanh toán', awaiting_deposit: 'Chờ đặt cọc', deposited: 'Đã đặt cọc', partial: 'Thanh toán một phần', paid: 'Đã thanh toán', refunded: 'Đã hoàn tiền', partially_refunded: 'Hoàn một phần' },
    notVat: 'Xác nhận đơn này không thay thế hoá đơn giá trị gia tăng.',
  },
};
