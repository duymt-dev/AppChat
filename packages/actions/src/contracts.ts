// Hợp đồng (Blueprint §3.4 sales; COMMERCE-DECISIONS §9 — D25). Prototype L5343–5488.
// Luồng: draft → submit → pending_approval → Owner "Duyệt & ký" (OTP + ký tay) → pending_signature → khách ký → signed.
// Agent / Trợ lý chỉ soạn nháp; duyệt & ký, gửi ký, chấm dứt cần `contract.sign` (mặc định chỉ Chủ sở hữu).
import { z } from 'zod';
import { defineAction } from './define';
import { money } from './sales-schemas';

const contractId = z.string().min(1);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const fields = z.object({
  contact_id: z.string().min(1),
  quote_id: z.string().optional(),
  number: z.string().max(60).optional(),
  kind: z.enum(['service', 'sale', 'framework']),
  title: z.string().trim().min(1).max(200).optional(),
  value: money,
  signed_date: day.optional(),
  start_date: day.optional(),
  end_date: day.optional(),
  owner_user_id: z.string().optional(),
  file_name: z.string().max(200).optional(),
  note: z.string().max(2000).optional(),
});
/**
 * Nguồn nội dung ký (TIP-030b spec 2): `template` (mặc định — mẫu theo loại) hoặc `file` (PDF / DOCX đã tải lên, `file_id` bắt buộc).
 * Không nhận cả hai cùng lúc (`file_id` ở nhánh template bị từ chối).
 */
const contractSource = z.discriminatedUnion('type', [
  z.object({ type: z.literal('template') }).strict(),
  z.object({ type: z.literal('file'), file_id: z.string().min(1) }).strict(),
]);
const out = z.object({ contract_id: z.string(), code: z.string() });
const st = z.object({ contract_id: z.string(), status: z.string() });
const opened = (o: { contract_id: string }) => ({
  type: 'open' as const,
  entity: 'contract',
  id: o.contract_id,
  view: 'drawer' as const,
});

export const contractCreate = defineAction({
  id: 'contract.create',
  module: 'sales',
  title: 'actions.contract.create.title',
  description:
    'Create a draft contract (kind service | sale | framework; value is VND string). Content comes from the template of that kind, or from an uploaded PDF / DOCX with source {"type":"file","file_id":…} (check it first with contract.inspect_file). Example: {"contact_id":"ct_lan","kind":"service","title":"Liệu trình HIFU 8 buổi","value":"12800000","start_date":"2026-06-16","end_date":"2026-12-16"}',
  input: fields.extend({ source: contractSource.optional() }),
  output: out,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts'],
  uiTarget: opened,
});

export const contractCreateFromQuote = defineAction({
  id: 'contract.create_from_quote',
  module: 'sales',
  title: 'actions.contract.create_from_quote.title',
  description:
    'Create a draft contract from an accepted quote ("→ Hợp đồng"): customer, lines and value are copied. Example: {"quote_id":"q_2041"}',
  input: z.object({ quote_id: z.string().min(1) }),
  output: out,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts', 'quotes'],
  uiTarget: opened,
});

export const contractUpdate = defineAction({
  id: 'contract.update',
  module: 'sales',
  title: 'actions.contract.update.title',
  description: 'Edit a draft contract. Example: {"contract_id":"ct_1182","patch":{"value":"20000000"}}',
  input: z.object({ contract_id: contractId, patch: fields.partial() }),
  output: z.object({ contract_id: z.string() }),
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts'],
});

export const contractSubmit = defineAction({
  id: 'contract.submit',
  module: 'sales',
  title: 'actions.contract.submit.title',
  description:
    'Submit a draft contract to the Owner (draft → pending_approval). Example: {"contract_id":"ct_1182"}',
  input: z.object({ contract_id: contractId }),
  output: st,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['contracts'],
});

export const contractApproveAndSign = defineAction({
  id: 'contract.approve_and_sign',
  module: 'sales',
  title: 'actions.contract.approve_and_sign.title',
  description:
    'Owner approves and signs the business side: OTP (email) + handwritten signature PNG (pending_approval → pending_signature). Never agent-run.',
  input: z.object({
    contract_id: contractId,
    otp: z.string().regex(/^\d{6}$/),
    signature_png: z.string().min(1),
  }),
  output: st,
  permission: 'contract.sign',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['contracts', 'crm'],
});

export const contractRequestChanges = defineAction({
  id: 'contract.request_changes',
  module: 'sales',
  title: 'actions.contract.request_changes.title',
  description:
    'Reviewer asks for changes; the contract goes back to draft. Example: {"contract_id":"ct_1182","reason":"Sửa điều khoản thanh toán"}',
  input: z.object({ contract_id: contractId, reason: z.string().max(500).optional() }),
  output: st,
  permission: 'contract.review',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['contracts'],
});

export const contractRejectInternal = defineAction({
  id: 'contract.reject_internal',
  module: 'sales',
  title: 'actions.contract.reject_internal.title',
  description: 'Reject a contract at internal approval (→ draft). Example: {"contract_id":"ct_1182"}',
  input: z.object({ contract_id: contractId, reason: z.string().max(500).optional() }),
  output: st,
  permission: 'contract.review',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['contracts'],
});

export const contractSendForSignature = defineAction({
  id: 'contract.send_for_signature',
  module: 'sales',
  title: 'actions.contract.send_for_signature.title',
  description:
    'Send the one-time signing link (7 days) to the customer over the conversation channel or email. Only after the business has signed.',
  input: z.object({ contract_id: contractId, channel: z.enum(['zalo_personal', 'email']) }),
  output: z.object({ contract_id: z.string(), sign_url: z.string(), expires_at: z.string() }),
  permission: 'contract.sign',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['contracts'],
});

export const contractRemindSigner = defineAction({
  id: 'contract.remind_signer',
  module: 'sales',
  title: 'actions.contract.remind_signer.title',
  description: 'Remind the customer to sign a pending contract. Example: {"contract_id":"ct_1181"}',
  input: z.object({ contract_id: contractId }),
  output: z.object({ contract_id: z.string() }),
  permission: 'contract.draft',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['contracts'],
});

export const contractExtendSignLink = defineAction({
  id: 'contract.extend_sign_link',
  module: 'sales',
  title: 'actions.contract.extend_sign_link.title',
  description: 'Extend the signing link by N days (default 7). Example: {"contract_id":"ct_1181","days":7}',
  input: z.object({ contract_id: contractId, days: z.number().int().min(1).max(30).optional() }),
  output: z.object({ contract_id: z.string(), expires_at: z.string() }),
  permission: 'contract.draft',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['contracts'],
});

export const contractTerminate = defineAction({
  id: 'contract.terminate',
  module: 'sales',
  title: 'actions.contract.terminate.title',
  description: 'Owner terminates a signed contract; reason is required. Orders already created are kept.',
  input: z.object({ contract_id: contractId, reason: z.string().trim().min(1).max(500) }),
  output: st,
  permission: 'contract.sign',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['contracts'],
});

export const contractRenew = defineAction({
  id: 'contract.renew',
  module: 'sales',
  title: 'actions.contract.renew.title',
  description:
    'Renew: create a new draft contract (renewal_of_id) that goes through approval and signing again. Example: {"contract_id":"ct_1178"}',
  input: z.object({ contract_id: contractId }),
  output: out,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts'],
  uiTarget: opened,
});

export const contractDelete = defineAction({
  id: 'contract.delete',
  module: 'sales',
  title: 'actions.contract.delete.title',
  description: 'Delete a draft contract that was never signed. Example: {"contract_id":"ct_1182"}',
  input: z.object({ contract_id: contractId }),
  output: z.object({ contract_id: z.string() }),
  permission: 'contract.draft',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts'],
});
