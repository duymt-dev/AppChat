// Provider domain `privacy` — pha 1 không có provider tiêm phụ (service dùng CLOCK + hàm thuần); giữ file theo manifest cho pha sau
// (worker cleanup, journal client) tránh phải sửa lại cấu trúc module.
export const PRIVACY_PROVIDERS = [] as const;
