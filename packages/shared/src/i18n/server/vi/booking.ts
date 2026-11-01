// Chữ lịch hẹn phía server — tiếng Việt (nguồn): gợi ý AI ở trang Lịch (theo luật), tin nhắc hẹn gửi khách (REQ-G04).
export const booking = {
  ai: {
    confirm: 'Gọi xác nhận khách chờ',
    confirmHint: '{n} lịch hẹn chờ xác nhận · soạn lời nhắc qua Zalo',
    gap: 'Lấp khung giờ trống hôm nay',
    gapHint: 'Còn nhiều khung trống · đề xuất mời khách tiềm năng đang quan tâm',
  },
  remind: {
    h24: 'Chào {name}, {business} nhắc lịch hẹn {service} lúc {time} ngày {date} ({code}). Anh/chị cần đổi giờ hay huỷ thì nhắn lại giúp em nhé.',
    h2: 'Chào {name}, còn khoảng 2 giờ nữa là tới lịch {service} lúc {time} hôm nay ({code}). Hẹn gặp anh/chị tại {business}!',
  },
};
