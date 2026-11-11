// Che vật liệu ký (TIP-030c §5.2): OTP / ảnh chữ ký / token link ký không vào log / action_log / lịch sử. Khoá dùng chung REDACT_KEYS
// (shared/log/redact.ts — logger + executor redactDeep); helper này che thêm chuỗi đường dẫn có token (/sign/<token>) trong URL log.
const SIGN_PATH = /\/sign\/(appendix\/)?[0-9a-f-]{36}\.[A-Za-z0-9_-]{32}/g;

export const redactSignUrl = (s: string) => s.replace(SIGN_PATH, (_m, a: string | undefined) => `/sign/${a ?? ''}[redacted]`);
