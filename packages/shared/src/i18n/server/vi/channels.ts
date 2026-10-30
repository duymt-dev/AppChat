// Chữ kênh phía server — tiếng Việt (nguồn): tên tài khoản mặc định, kết quả "Kiểm tra kết nối", giá trị mặc định của cấu hình.
export const channels = {
  name: { zalo_personal: 'Zalo cá nhân', email: 'Email', webchat: 'Website Chat' },
  test: {
    ok: 'Kết nối hoạt động bình thường',
    paused: 'Tài khoản đang tạm dừng',
    connecting: 'Đang chờ quét mã QR',
    expired: 'Phiên đăng nhập đã hết hạn — kết nối lại để quét mã mới',
    error: 'Không giữ được phiên — đang thử kết nối lại',
    disconnected: 'Tài khoản đã ngắt kết nối',
  },
  defaults: { hours: '08:00–18:00', sla: 'Mặc định' },
};
