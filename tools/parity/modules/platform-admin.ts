// Parity TIP-040: màn Quản trị nền tảng `/admin` KHÔNG có trong prototype (PD-022) — không có khung để so pixel, nên không thêm dòng
// nào vào manifest và không tuyên bố diff < 5%. Màn dựng từ primitive / token (`packages/ui/theme.ts`); hành vi, trạng thái, i18n và
// mobile 390 kiểm ở e2e/platform-admin.spec.ts (mock) + e2e/http/platform-admin.spec.ts (http). Khi có bản thiết kế được duyệt, thêm
// dòng ở đây (route `/admin?tab=…`, appWait `[data-testid="adm-screen"]`) rồi re-export qua parity.manifest.ts.
import type { ParityEntry } from '../parity.manifest';

export const PLATFORM_ADMIN: ParityEntry[] = [];
