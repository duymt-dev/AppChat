// Phụ lục hợp đồng (TIP-030b F3 spec 12–16; COMMERCE §9 "muốn thay đổi phải tạo phụ lục" — cùng luồng duyệt và ký, Owner ký trước).
// Chỉ cho hợp đồng đã ký; ký riêng (token / OTP / chứng cứ gắn phụ lục + version + digest). `value_delta` là siêu dữ liệu thoả thuận —
// không tự đổi đơn / hoá đơn / sổ thu. Bốn action `contract.appendix_public_*` chỉ chạy qua bộ chuyển token của trang ký công khai
// (capability niêm phong trong core) — ẩn khỏi Trợ lý / agent, gọi thẳng /actions (kể cả Owner) bị từ chối.
import { z } from 'zod';
import { defineAction } from './define';
import { docChannel } from './sales-schemas';

const id = z.string().min(1);
const signedMoney = z.string().regex(/^-?\d+$/);
const st = z.object({ appendix_id: z.string(), status: z.string(), version: z.number().int() });
const opened = (o: { contract_id: string }) => ({ type: 'open' as const, entity: 'contract', id: o.contract_id, view: 'drawer' as const });
const body = {
  title: z.string().trim().min(1).max(200),
  /** Nội dung điều chỉnh (chữ thuần — render thành trang phụ lục, escape). */
  content: z.string().trim().min(1).max(20_000).optional(),
  /** Tệp PDF / DOCX đã tải lên (người gọi là người tải) — dùng nguyên bản làm nội dung ký. */
  file_id: id.optional(),
  value_delta: signedMoney.optional(),
  note: z.string().max(2000).optional(),
};
const oneSource = (v: { content?: string; file_id?: string }) => !!v.content !== !!v.file_id;

export const contractCreateAppendix = defineAction({
  id: 'contract.create_appendix',
  module: 'sales',
  title: 'actions.contract.create_appendix.title',
  description:
    'Create a draft appendix for a SIGNED contract (changes after signing go through an appendix with its own approval + signatures). Give exactly one of content (plain text) or file_id (uploaded PDF / DOCX). value_delta is a signed VND string, informational only. request_key makes retries return the same appendix. Example: {"contract_id":"0193…","title":"Bổ sung 2 buổi","content":"Bổ sung 2 buổi chăm sóc da…","value_delta":"1000000","request_key":"k1"}',
  input: z.object({ contract_id: id, ...body, request_key: z.string().trim().min(1).max(100) }).refine(oneSource, { message: 'content_xor_file_id', path: ['content'] }),
  output: z.object({ contract_id: z.string(), appendix_id: z.string(), code: z.string() }),
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['contracts'],
  uiTarget: opened,
});

export const contractAppendixUpdate = defineAction({
  id: 'contract.appendix_update',
  module: 'sales',
  title: 'actions.contract.appendix_update.title',
  description: 'Edit a draft appendix (version +1 — old links / OTP stop working). if_version must match. Example: {"appendix_id":"0193…","if_version":1,"patch":{"title":"Bổ sung 3 buổi"}}',
  input: z.object({ appendix_id: id, if_version: z.number().int().min(1), patch: z.object({ title: body.title.optional(), content: body.content, value_delta: signedMoney.nullable().optional(), note: body.note }).strict() }),
  output: st,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['contracts'],
});

export const contractAppendixSubmit = defineAction({
  id: 'contract.appendix_submit',
  module: 'sales',
  title: 'actions.contract.appendix_submit.title',
  description: 'Submit a draft appendix to the Owner (draft → pending_approval). Example: {"appendix_id":"0193…"}',
  input: z.object({ appendix_id: id }),
  output: st,
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['contracts'],
});

export const contractAppendixRequestChanges = defineAction({
  id: 'contract.appendix_request_changes',
  module: 'sales',
  title: 'actions.contract.appendix_request_changes.title',
  description: 'Send a submitted appendix back to draft with a reason (pending_approval → draft). Example: {"appendix_id":"0193…","reason":"Sai số buổi"}',
  input: z.object({ appendix_id: id, reason: z.string().max(500).optional() }),
  output: st,
  permission: 'contract.review',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['contracts'],
});

export const contractAppendixOwnerOtp = defineAction({
  id: 'contract.appendix_owner_otp',
  module: 'sales',
  title: 'actions.contract.appendix_owner_otp.title',
  description: 'Owner step-up: email a one-time code for "Approve & sign" of this appendix (bound to its current version). Never agent-run.',
  input: z.object({ appendix_id: id }),
  output: z.object({ appendix_id: z.string(), sent_to: z.string() }),
  permission: 'contract.sign',
  risk: 'write',
  agentGrantable: false,
  invalidates: [],
});

export const contractAppendixApproveAndSign = defineAction({
  id: 'contract.appendix_approve_and_sign',
  module: 'sales',
  title: 'actions.contract.appendix_approve_and_sign.title',
  description: 'Owner approves and signs the business side of an appendix: its own OTP + handwritten signature PNG (pending_approval → pending_signature). The parent contract signature does not count. Never agent-run.',
  input: z.object({ appendix_id: id, if_version: z.number().int().min(1), otp: z.string().regex(/^\d{6}$/), signature_png: z.string().min(1) }),
  output: st,
  permission: 'contract.sign',
  risk: 'money',
  agentGrantable: false,
  secret: { paths: ['otp'] },
  invalidates: ['contracts'],
});

export const contractAppendixSend = defineAction({
  id: 'contract.appendix_send',
  module: 'sales',
  title: 'actions.contract.appendix_send.title',
  description: 'Send the customer a one-time 7-day signing link for an Owner-signed appendix (Zalo chat / email). Never agent-run.',
  input: z.object({ appendix_id: id, channel: docChannel }),
  output: z.object({ appendix_id: z.string(), sign_url: z.string(), expires_at: z.string() }),
  permission: 'contract.sign',
  risk: 'send',
  agentGrantable: false,
  invalidates: ['contracts', 'inbox'],
});

/** Trang ký công khai phụ lục — chỉ bộ chuyển token gọi (capability niêm phong); input không mang token / người ký / workspace. */
const pub = { appendix_id: id };
const pubView = z.object({ appendix_id: z.string(), status: z.string() });

export const contractAppendixPublicOtp = defineAction({
  id: 'contract.appendix_public_otp',
  module: 'sales',
  title: 'actions.contract.appendix_public_otp.title',
  description: 'System-only (public appendix signing page): send the customer OTP. Not callable by users, assistant or agents.',
  input: z.object(pub),
  output: z.object({ appendix_id: z.string(), channel: z.string(), sent_to: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['contracts', 'inbox'],
});

export const contractAppendixPublicSign = defineAction({
  id: 'contract.appendix_public_sign',
  module: 'sales',
  title: 'actions.contract.appendix_public_sign.title',
  description: 'System-only (public appendix signing page): customer signs with OTP + signature. Not callable by users, assistant or agents.',
  input: z.object({ ...pub, otp: z.string().regex(/^\d{6}$/), signature_png: z.string().min(1), consent: z.literal(true) }),
  output: pubView.extend({ signed_sha256: z.string() }),
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  secret: { paths: ['otp'] },
  invalidates: ['contracts', 'inbox'],
});

export const contractAppendixPublicDecline = defineAction({
  id: 'contract.appendix_public_decline',
  module: 'sales',
  title: 'actions.contract.appendix_public_decline.title',
  description: 'System-only (public appendix signing page): customer declines. Not callable by users, assistant or agents.',
  input: z.object({ ...pub, reason: z.string().max(500).optional() }),
  output: pubView,
  permission: 'self',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['contracts'],
});
