// Hợp đồng đọc "Quên khách" (TIP-015c §1.2–§1.4): preview, trạng thái, danh sách — không kiểu nào mang chữ chat/nguồn thô.
import { z } from 'zod';
import { PRIVACY_ITEM_DISPOSITIONS, PRIVACY_OPERATION_PHASES } from '../privacy/state';

export const privacyOperationPhaseSchema = z.enum(PRIVACY_OPERATION_PHASES);
export const privacyItemDispositionSchema = z.enum(PRIVACY_ITEM_DISPOSITIONS);

/** GET /v1/contacts/:id/privacy-preview (contact.privacy_preview) — họ hiện tại + chặn + đếm theo loại, không id/tiền bên trong. */
export const privacyPreviewSchema = z.object({
  canonical_contact_id: z.string(),
  family_generation: z.number().int(),
  family_size: z.number().int(),
  inventory_revision: z.string(),
  blockers: z.array(z.object({ kind: z.string(), count: z.number().int() })),
  removable_count: z.number().int(),
  shared_count: z.number().int(),
  retained_count: z.number().int(),
  irreversible: z.literal(true),
  no_external_deletion: z.literal(true),
});
export type PrivacyPreview = z.infer<typeof privacyPreviewSchema>;

/** GET /v1/privacy/operations/:id (contact.privacy_status) + list — chỉ số đếm/pha, không nội dung mục. */
export const privacyOperationStatusSchema = z.object({
  id: z.string(),
  phase: privacyOperationPhaseSchema,
  version: z.number().int(),
  counts: z.object({ total: z.number().int(), resolved: z.number().int(), retained: z.number().int() }),
  retained_categories: z.array(z.string()),
  unresolved_item_ids: z.array(z.string()),
  progress: z.number().min(0).max(1),
  created_at: z.string(),
  updated_at: z.string(),
});
export type PrivacyOperationStatus = z.infer<typeof privacyOperationStatusSchema>;

export const privacyOperationListSchema = z.object({
  data: z.array(privacyOperationStatusSchema),
  next_cursor: z.string().nullable(),
});
