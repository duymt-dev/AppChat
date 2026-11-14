// Tập dữ liệu của kế hoạch nhập (TIP-026b §5): server suy tập hợp lệ từ thực thể (registry `DATASETS_OF`), người gọi không chọn adapter
// tuỳ ý. Kế hoạch lưu `dataset` + `dataset_schema_version` lúc tạo (bất biến — trigger migration); mọi bước sau (đổi ánh xạ, xác nhận,
// runner, biên nhận) phân phối theo giá trị ĐÃ LƯU. Lược đồ tập đã đổi so với lúc lập → 409 lập lại, không chạy theo luật mới trên ánh xạ cũ.
import {
  AppError,
  datasetAllowed,
  exportOnly,
  targetOf,
  transferSpec,
  type TransferDataset,
  type TransferEntity,
  type TransferTarget,
} from '@appchat/shared';

/** Thực thể + tập (bỏ trống = base) → khoá registry NHẬP. Tập không thuộc thực thể / tập chỉ xuất → 422. */
export function resolveTarget(entity: TransferEntity, dataset: TransferDataset | undefined | null): TransferTarget {
  const d = dataset ?? 'base';
  if (!datasetAllowed(entity, d)) throw new AppError('VALIDATION_FAILED', 422, { dataset: 'unsupported' });
  const t = targetOf(entity, d);
  // Tập chỉ xuất (liệu trình — TIP-033b §5.1): mọi đường nhập (xem mẫu / lập kế hoạch / AI / xác nhận) dừng ở đây, trước khi đọc tệp hay ghi.
  if (exportOnly(t)) throw new AppError('VALIDATION_FAILED', 422, { dataset: 'export_only' });
  return t;
}

type PlanIdentity = { entity: string; dataset: string; datasetSchemaVersion: number };

/** Khoá registry của kế hoạch đã lưu; lược đồ tập khác bản hiện hành → 409 `dataset_schema_version: stale` (phải lập kế hoạch mới). */
export function planTarget(p: PlanIdentity): TransferTarget {
  const t = resolveTarget(p.entity as TransferEntity, p.dataset as TransferDataset);
  const current = transferSpec(t).schemaVersion;
  if (p.datasetSchemaVersion !== current)
    throw new AppError('CONFLICT', 409, { dataset_schema_version: 'stale', version: String(current) });
  return t;
}

/** Danh tính tập để lưu vào kế hoạch (cố định từ đây). */
export const datasetIdentity = (t: TransferTarget) => {
  const s = transferSpec(t);
  return { dataset: s.dataset, datasetSchemaVersion: s.schemaVersion };
};

/** Xác nhận / tiếp tục / đổi ánh xạ có gửi kèm tập: khác tập đã lưu → 409 (không dùng lại xác nhận / biên nhận của tập khác). */
export function assertDataset(p: { dataset: string }, sent: TransferDataset | undefined) {
  if (sent !== undefined && sent !== p.dataset) throw new AppError('CONFLICT', 409, { dataset: 'mismatch' });
}
