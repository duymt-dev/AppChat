// Hợp đồng đọc nhập / xuất dữ liệu (TIP-038b, DC-374): kế hoạch nhập của người tạo (`GET /v1/data-transfer/plans/:id`), trang dòng xem
// trước / lỗi (`/rows?check&cursor`), năng lực (`GET /v1/data-transfer/capabilities`). Chỉ người tạo đọc được kế hoạch của mình.
import { z } from 'zod';
import { TRANSFER_DATASETS, TRANSFER_ENTITIES, TRANSFER_FORMATS } from '../data-transfer/registry';

export const transferEntitySchema = z.enum(TRANSFER_ENTITIES);
/** Tập dữ liệu (TIP-026b §5) — `base` khi bỏ trống; tập con chỉ hợp lệ dưới thực thể của nó (server kiểm). */
export const transferDatasetSchema = z.enum(TRANSFER_DATASETS);
export const TRANSFER_PLAN_STATUSES = [
  'draft',
  'committing',
  'completed',
  'cancelled',
  'failed',
  'expired',
] as const;
export const TRANSFER_ROW_CHECKS = ['valid', 'invalid', 'duplicate', 'owned'] as const;
export const TRANSFER_ROW_STATUSES = ['pending', 'applied', 'skipped', 'failed'] as const;

export const transferPlanSchema = z.object({
  id: z.string(),
  entity: transferEntitySchema,
  /** Tập dữ liệu cố định của kế hoạch + phiên bản lược đồ lúc lập (TIP-026b §5). */
  dataset: transferDatasetSchema,
  dataset_schema_version: z.number().int(),
  file_name: z.string(),
  sheet: z.string().nullable(),
  /** Danh sách cột của tệp (để sửa ánh xạ). */
  columns: z.array(z.string()),
  mapping: z.record(z.string(), z.string()),
  version: z.number().int(),
  row_policy: z.enum(['all_valid', 'only_valid']),
  status: z.enum(TRANSFER_PLAN_STATUSES),
  counts: z.object({
    total: z.number().int(),
    valid: z.number().int(),
    invalid: z.number().int(),
    duplicates: z.number().int(),
    applied: z.number().int(),
    skipped: z.number().int(),
    failed: z.number().int(),
  }),
  job_id: z.string().nullable(),
  error: z.string().nullable(),
  expires_at: z.string(),
  created_at: z.string(),
});
export type TransferPlanDto = z.infer<typeof transferPlanSchema>;

export const transferRowSchema = z.object({
  row_no: z.number().int(),
  data: z.record(z.string(), z.string()),
  check: z.enum(TRANSFER_ROW_CHECKS),
  errors: z.record(z.string(), z.string()),
  status: z.enum(TRANSFER_ROW_STATUSES),
  result_id: z.string().nullable(),
  result_code: z.string().nullable(),
});
export type TransferRowDto = z.infer<typeof transferRowSchema>;
export const transferRowsPageSchema = z.object({
  data: z.array(transferRowSchema),
  next_cursor: z.string().nullable(),
});

export const transferCapabilitySchema = z.object({
  entity: transferEntitySchema,
  dataset: transferDatasetSchema,
  import: z.object({
    supported: z.boolean(),
    reason: z.string().nullable(),
    formats: z.array(z.enum(TRANSFER_FORMATS)),
    fields: z.array(z.object({ key: z.string(), required: z.boolean() })),
  }),
  export: z.object({ supported: z.boolean(), reason: z.string().nullable(), action_id: z.string() }),
});
export type TransferCapabilityDto = z.infer<typeof transferCapabilitySchema>;

/** Mẫu tệp cho Trợ lý / màn nhập (`transfer.sample`): ô đã che — không dữ liệu liên hệ thật. */
export const transferSampleSchema = z.object({
  dataset: transferDatasetSchema,
  file_name: z.string(),
  sheets: z.array(z.string()),
  sheet: z.string().nullable(),
  columns: z.array(z.string()),
  total_rows: z.number().int(),
  sample: z.array(z.array(z.string())),
  fields: z.array(z.object({ key: z.string(), type: z.string(), required: z.boolean(), options: z.array(z.string()).optional(), item: z.boolean().optional(), hint: z.enum(['plain_projection', 'structured_json']).optional(), warnings: z.array(z.string()).optional() })),
  mapping: z.record(z.string(), z.string()),
  import_supported: z.boolean(),
});
export type TransferSampleDto = z.infer<typeof transferSampleSchema>;
