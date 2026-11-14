// Parity runtime kết nối (TIP-012b P3, PD-025): drawer chi tiết kết nối (sức khoẻ / đồng bộ / nhật ký gọi) KHÔNG có trong prototype
// (prototype chỉ có thẻ + hộp kết nối L6219–6266) → không baseline, không tuyên bố diff. Thẻ + hộp kết nối vẫn so ở
// `settings:integrations` / `settings:integrations-connect` (parity.manifest.ts).
import type { ParityEntry } from '../parity.manifest';

export const INTEGRATION_RUNTIME: ParityEntry[] = [];
