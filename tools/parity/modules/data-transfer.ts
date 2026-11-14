// Parity TIP-038b P4: TransferPanel "Nhập dữ liệu từ tệp" KHÔNG có trong prototype (PD-023 — prototype chỉ có nút "Nhập" L2460 ở màn
// Khách hàng, đã so ở `customers:*`) — không có khung để so pixel, nên không thêm dòng và không tuyên bố diff < 5%. Panel dựng từ
// ModalShell + token (`packages/ui/theme.ts`); hành vi, trạng thái, i18n và mobile 390 kiểm ở e2e/data-transfer.spec.ts (mock) +
// e2e/http/data-transfer.spec.ts (http). Khi có thiết kế được duyệt, thêm dòng ở đây (appWait `[data-testid="dt-panel"]`).
import type { ParityEntry } from '../parity.manifest';

export const DATA_TRANSFER: ParityEntry[] = [];
