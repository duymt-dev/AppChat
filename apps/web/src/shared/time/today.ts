// Ngày hôm nay (YYYY-MM-DD, giờ máy người dùng) cho form chứng từ: mock giữ ngày cố định của parity (prototype-parity §4 — 24/06/2026),
// http lấy ngày thật để hạn / ngày nhận không bị server từ chối là ngày quá khứ / tương lai.
import { apiMode } from '../api/transport';

export const MOCK_TODAY = '2026-06-24';

export function todayIso(): string {
  if (apiMode() === 'mock') return MOCK_TODAY;
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
