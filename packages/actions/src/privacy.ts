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

/** System-only (TIP-015c §1.3 point 7, pha 2): chỉ worker ROLE=jobs gọi qua sweep job (actor system:privacy-cleanup). Không agent/UI/HTTP. */
export const privacyCleanupStep = defineAction({
  id: 'privacy.cleanup_step',
  module: 'crm',
  title: 'actions.privacy.cleanup_step.title',
  description: 'System-only: advance one "forget customer" operation by one PRIVACY_FLOW step (fence → inventory → erase batch → needs_review/verify → completed_with_exceptions). Not callable by users, assistant or agents.',
  input: z.object({ operation_id: uuid }),
  output: z.object({ operation_id: z.string(), phase: z.string(), advanced: z.boolean(), erased: z.number().int(), pending: z.number().int() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  exposure: 'internal',
  invalidates: ['crm'],
});

export const privacyReviewResolve = defineAction({
  id: 'privacy.review_resolve',
  module: 'crm',
  title: 'actions.privacy.review_resolve.title',
  description:
    'Human decision on one quarantined item of a "forget customer" operation (DC-265 shared/unknown content): proven_unrelated (not this customer), erase_exclusive (confirmed this customer only), redact_shared (shared — keep others, strip this subject), retained_issued (confirmed issued/signed evidence, DC-259). Requires current artifact version. Example: {"operation_id":"0190f000-0000-7000-8000-000000000002","item_id":"0190f000-0000-7000-8000-000000000003","if_version":1,"disposition":"proven_unrelated"}',
  input: z.object({
    operation_id: uuid,
    item_id: uuid,
    if_version: z.number().int().positive(),
    disposition: z.enum(['proven_unrelated', 'erase_exclusive', 'redact_shared', 'retained_issued']),
    proof_ref: z.string().min(1).max(200).optional(),
  }),
  output: z.object({ item_id: z.string(), disposition: z.string() }),
  permission: 'privacy.erase',
  risk: 'delete',
  agentGrantable: false,
  requiredApprovalSources: ['assistant', 'agent', 'task'],
  invalidates: ['crm'],
});

const recreationIdentifier = z.object({
  kind: z.enum(['phone', 'email', 'provider']),
  value: z.string().min(1).max(254),
  channel_account_id: uuid.optional(),
});

export const contactAllowRecreation = defineAction({
  id: 'contact.allow_recreation',
  module: 'crm',
  title: 'actions.contact.allow_recreation.title',
  description:
    'Issue a one-time permit to create a NEW contact profile from identifiers (phone/email/provider account) that were tombstoned by a prior "forget customer" (DC-260). Does not restore old data — only unblocks contact.create for exactly these identifiers. Example: {"identifiers":[{"kind":"phone","value":"+84909123456"}],"create_input":{"full_name":"Nguyễn Thị Lan","phone":"+84909123456"}}',
  input: z.object({ identifiers: z.array(recreationIdentifier).min(1).max(10), create_input: z.record(z.string(), z.unknown()) }),
  output: z.object({ permit_id: z.string(), expires_at: z.string() }),
  permission: 'privacy.erase',
  risk: 'config',
  agentGrantable: false,
  requiredApprovalSources: ['assistant', 'agent', 'task'],
  invalidates: [],
});

// privacy.inventory_scan: thêm ở pha sau có handler thật (legacy-scanner bootstrap — chưa cài ở pha 3) — đăng ký action mà chưa có
// handler bị cấm (ANTI-MONOLITH "không nửa vời").
