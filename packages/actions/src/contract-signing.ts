// Ký hợp đồng cha (TIP-030c): trang ký công khai + OTP "Duyệt & ký" của Owner thành action chuẩn. Sáu action `contract.public_*` /
// `contract.sign_attempt_*` là action riêng (`exposure:'internal'`) — chỉ bộ chuyển token / pipeline ký trong core gọi qua capability
// niêm phong; /actions (kể cả Owner), Trợ lý, agent đều 403 trước prepare. Input chỉ là tham chiếu đã kiểm (request / attempt) + metadata
// đóng — OTP / chữ ký nằm trong phong bì bí mật tạm của server, không bao giờ ở input / kết quả chung. `contract.request_sign_otp` là action
// người dùng (quyền `contract.sign`, như trước) thay cho endpoint `POST /contracts/:id/sign-otp` (giữ làm facade).
import { z } from 'zod';
import { defineAction } from './define';

const id = z.string().min(1);
const ref = z.string().min(1).max(200);
const internal = { permission: 'self' as const, agentGrantable: false, exposure: 'internal' as const };
const view = z.object({ contract_id: z.string(), status: z.string() });
const disposition = z.enum(['rejected', 'verified', 'staged', 'finalized', 'stale', 'expired']);

export const contractPublicOpen = defineAction({
  id: 'contract.public_open',
  module: 'sales',
  title: 'actions.contract.public_open.title',
  description: 'System-only (public signing page): record one intended visit of the customer signing link. Not callable by users, assistant or agents.',
  input: z.object({ contract_id: id, request_ref: ref }),
  output: view.extend({ recorded: z.boolean() }),
  risk: 'write',
  ...internal,
  invalidates: ['contracts'],
});

export const contractPublicOtp = defineAction({
  id: 'contract.public_otp',
  module: 'sales',
  title: 'actions.contract.public_otp.title',
  description: 'System-only (public signing page): send the customer a new signing OTP in the conversation the link was sent to.',
  input: z.object({ contract_id: id, request_ref: ref }),
  output: z.object({ contract_id: z.string(), channel: z.string(), sent_to: z.string(), otp_generation: z.number().int(), delivery_status: z.enum(['queued', 'accepted', 'unknown', 'suppressed']) }),
  risk: 'send',
  ...internal,
  invalidates: ['contracts', 'inbox'],
});

export const contractPublicDecline = defineAction({
  id: 'contract.public_decline',
  module: 'sales',
  title: 'actions.contract.public_decline.title',
  description: 'System-only (public signing page): customer declines to sign.',
  input: z.object({ contract_id: id, request_ref: ref, reason: z.string().max(500).optional() }),
  output: view,
  risk: 'write',
  ...internal,
  invalidates: ['contracts', 'crm'],
});

export const contractPublicSign = defineAction({
  id: 'contract.public_sign',
  module: 'sales',
  title: 'actions.contract.public_sign.title',
  description: 'System-only (public signing page): finalize a verified + staged customer signing attempt (consume OTP + token, confirm PDF, signed).',
  input: z.object({ contract_id: id, attempt_id: id }),
  output: view.extend({ attempt_id: z.string(), disposition, signed_sha256: z.string().nullable() }),
  risk: 'money',
  ...internal,
  invalidates: ['contracts', 'crm', 'inbox'],
});

export const contractSignAttemptPrepare = defineAction({
  id: 'contract.sign_attempt_prepare',
  module: 'sales',
  title: 'actions.contract.sign_attempt_prepare.title',
  description: 'System-only (signing pipeline): verify an OTP + signature attempt against the exact OTP generation and document snapshot; records failures durably.',
  input: z.object({ contract_id: id, party: z.enum(['business', 'customer']), request_ref: ref }),
  output: z.object({ attempt_id: z.string(), disposition, remaining_attempts: z.number().int().nullable(), rejection_code: z.string().nullable() }),
  risk: 'write',
  ...internal,
  invalidates: ['contracts'],
});

export const contractSignAttemptStage = defineAction({
  id: 'contract.sign_attempt_stage',
  module: 'sales',
  title: 'actions.contract.sign_attempt_stage.title',
  description: 'System-only (signing pipeline): attach fenced, read-back-verified candidate PDF + signature files to a verified attempt, or mark it stale.',
  input: z.object({ contract_id: id, attempt_id: id, render_generation: z.number().int().min(1), outcome: z.enum(['staged', 'stale']) }),
  output: z.object({ attempt_id: z.string(), disposition }),
  risk: 'write',
  ...internal,
  invalidates: ['contracts'],
});

export const contractRequestSignOtp = defineAction({
  id: 'contract.request_sign_otp',
  module: 'sales',
  title: 'actions.contract.request_sign_otp.title',
  description: 'Owner / delegated signer step-up: email yourself a one-time code for "Approve & sign" of this contract. Human UI only; never agent-run. Example: {"contract_id":"0193…","expected_version":3}',
  input: z.object({ contract_id: id, expected_version: z.number().int().min(1).optional() }),
  output: z.object({ contract_id: z.string(), sent_to: z.string(), delivery_status: z.enum(['queued', 'accepted', 'unknown', 'suppressed']) }),
  permission: 'contract.sign',
  risk: 'send',
  agentGrantable: false,
  invalidates: [],
});
