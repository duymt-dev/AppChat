// "Quên khách" (TIP-015c §1): contact.forget không thể đảo ngược — privacy.erase, risk delete, không cấp agent, không hoàn tác, không
// hàng loạt. Xem trước bắt buộc (mandatory-preview ở kernel/actions/policy.ts MANDATORY_PREVIEW_ACTIONS) cho CẢ ui lẫn assistant.
import { z } from 'zod';
import { defineAction } from './define';

const uuid = z.string().uuid();
const sha256Hex = z.string().regex(/^[0-9a-f]{64}$/i);

export const contactPrivacyPreview = defineAction({
  id: 'contact.privacy_preview',
  module: 'crm',
  title: 'actions.contact.privacy_preview.title',
  description:
    'Preview the current family/version and inventory revision before an irreversible "forget customer" request. Read-only — never writes a plan. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001"}',
  input: z.object({ contact_id: uuid }),
  output: z.object({
    canonical_contact_id: z.string(),
    family_generation: z.number().int(),
    family_size: z.number().int(),
    inventory_revision: sha256Hex,
    blockers: z.array(z.object({ kind: z.string(), count: z.number().int() })),
    removable_count: z.number().int(),
    shared_count: z.number().int(),
    retained_count: z.number().int(),
    irreversible: z.literal(true),
    no_external_deletion: z.literal(true),
  }),
  permission: 'privacy.erase',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const contactForget = defineAction({
  id: 'contact.forget',
  module: 'crm',
  title: 'actions.contact.forget.title',
  description:
    'Irreversibly forget a customer family: erase private operational content, keep issued/signed financial evidence (DC259), tombstone identity to prevent silent re-creation (DC260). Blocked while open orders/contracts/receivables exist (DC262). Never bypassable by assistant/agent/task — human confirmation only. Example: {"contact_id":"0190f000-0000-7000-8000-000000000001","if_version":3,"inventory_revision":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}',
  input: z.object({ contact_id: uuid, if_version: z.number().int().positive(), inventory_revision: sha256Hex }),
  output: z.object({ operation_id: z.string(), phase: z.string() }),
  permission: 'privacy.erase',
  risk: 'delete',
  agentGrantable: false,
  requiredApprovalSources: ['assistant', 'agent', 'task'],
  invalidates: ['crm'],
});

export const contactPrivacyStatus = defineAction({
  id: 'contact.privacy_status',
  module: 'crm',
  title: 'actions.contact.privacy_status.title',
  description: 'Read the progress of a "forget customer" operation by id — phase/counts/version only, never retained content. Example: {"operation_id":"0190f000-0000-7000-8000-000000000002"}',
  input: z.object({ operation_id: uuid }),
  output: z.object({
    id: z.string(),
    phase: z.string(),
    version: z.number().int(),
    counts: z.object({ total: z.number().int(), resolved: z.number().int(), retained: z.number().int() }),
    retained_categories: z.array(z.string()),
    unresolved_item_ids: z.array(z.string()),
    progress: z.number(),
  }),
  permission: 'privacy.erase',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

// privacy.review_resolve · contact.allow_recreation · privacy.cleanup_step · privacy.inventory_scan: thêm cùng pha có handler thật
// (TIP-015c pha 2 — inventory/cleanup) — đăng ký action mà chưa có handler bị cấm (ANTI-MONOLITH "không nửa vời").
