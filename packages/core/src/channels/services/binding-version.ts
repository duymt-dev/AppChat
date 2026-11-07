// Phiên bản cấu hình gán agent của tài khoản kênh (TIP-022b): băm `agent_id` + `routing` — so khi xác nhận đổi gán để phát hiện người khác
// đổi đồng thời (409, giữ gán cũ). Đọc ở drawer Quản lý kênh + xem trước gán khi xuất bản agent.
import { createHash } from 'node:crypto';

export const bindingVersion = (settings: unknown) => {
  const s = (settings ?? {}) as { agent_id?: string | null; routing?: unknown };
  return createHash('sha256').update(JSON.stringify([s.agent_id ?? null, s.routing ?? null])).digest('hex').slice(0, 16);
};
