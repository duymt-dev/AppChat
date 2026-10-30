// Chữ hộp thư phía server — tiếng Việt (nguồn): preview tin không phải chữ, mốc ngày trong khung chat, thẻ "Kết nối kênh",
// thông tin nhóm, tên thư mục đã lưu.
export const inbox = {
  preview: { image: '[Hình ảnh]', file: '[Tệp]', sticker: '[Sticker]', audio: '[Ghi âm]', card: '[Thẻ]', note: '[Ghi chú]', system: '' },
  day: { today: 'Hôm nay', yesterday: 'Hôm qua' },
  connect: {
    zalo_personal: { tag: 'Quét QR đăng nhập', time: '2 phút' },
    webchat: { tag: 'Widget nhúng web', time: '5 phút' },
    email: { tag: 'IMAP/SMTP', time: '5 phút' },
    soon: { tag: 'Sắp có', time: '—' },
  },
  group: { hint: '{members} thành viên · {contacts} đã có hồ sơ', unknown: 'Chưa có hồ sơ', member: 'Thành viên', pinned: '{count} tin ghim' },
  groupTitle: 'Nhóm {channel}',
  unknownContact: 'Khách',
};
