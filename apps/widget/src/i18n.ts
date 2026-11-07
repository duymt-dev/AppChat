// Chữ của widget (vi nguồn + en) — widget chạy trên website khách hàng, không dùng next-intl của apps/web. Ngôn ngữ theo
// `data-locale` của thẻ nhúng, rồi `<html lang>`, mặc định vi.
export const MESSAGES = {
  vi: {
    open: 'Mở trò chuyện',
    close: 'Đóng',
    placeholder: 'Nhập tin nhắn…',
    send: 'Gửi',
    prechatTitle: 'Cho shop xin thông tin để hỗ trợ bạn nhé',
    name: 'Họ tên',
    phone: 'Số điện thoại',
    email: 'Email',
    start: 'Bắt đầu trò chuyện',
    required: 'Vui lòng nhập đủ thông tin',
    offline: 'Shop đang tạm ngoại tuyến — vui lòng quay lại sau',
    failed: 'Gửi không thành công — bấm để gửi lại',
    tooFast: 'Bạn gửi hơi nhanh, chờ chút nhé',
    connecting: 'Đang kết nối…',
  },
  en: {
    open: 'Open chat',
    close: 'Close',
    placeholder: 'Type a message…',
    send: 'Send',
    prechatTitle: 'Tell us a bit about you so we can help',
    name: 'Full name',
    phone: 'Phone number',
    email: 'Email',
    start: 'Start chatting',
    required: 'Please fill in all fields',
    offline: 'We are offline right now — please come back later',
    failed: 'Not sent — tap to retry',
    tooFast: 'You are sending too fast, please wait a moment',
    connecting: 'Connecting…',
  },
} as const;

export type Locale = keyof typeof MESSAGES;
export type Messages = (typeof MESSAGES)[Locale];

export function pickLocale(explicit: string | null | undefined, doc: Document): Locale {
  const raw = (explicit || doc.documentElement.lang || 'vi').toLowerCase();
  return raw.startsWith('en') ? 'en' : 'vi';
}
