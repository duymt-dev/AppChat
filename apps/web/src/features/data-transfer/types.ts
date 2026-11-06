// Kiểu màn Nhập dữ liệu dùng chung (TIP-038b P4, DC-374) — DTO lấy từ `@appchat/shared` (cùng hợp đồng API thật), ở đây chỉ trạng thái UI.
import type { TransferEntity, TransferPlanDto, TransferRowDto, TransferSampleDto } from '@appchat/shared';

export type { TransferEntity, TransferPlanDto, TransferRowDto, TransferSampleDto };

/** Kết quả transfer.commit (output action). */
export interface TransferCommitResult {
  plan_id: string;
  status: string;
  applied: number;
  skipped: number;
  failed: number;
  job_id: string | null;
}

/** Bước của panel: chọn tệp → ánh xạ + xem trước (kế hoạch nháp) → kết quả. */
export type TransferStep = 'pick' | 'plan' | 'result';

/** Mở panel: chọn sẵn thực thể (từ nút "Nhập" của màn) hoặc mở đúng kế hoạch (Trợ lý vừa lập / thẻ xác nhận). */
export type TransferOpen = { entity: TransferEntity; planId?: undefined } | { planId: string; entity?: TransferEntity };
