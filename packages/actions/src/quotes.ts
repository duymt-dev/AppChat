// Báo giá (Blueprint §3.4 sales; COMMERCE-DECISIONS §3, §12). Prototype L4957–5187.
// Hiệu lực 15 ngày kể từ lúc gửi; vượt ngưỡng (tổng > 20tr / giảm > 5% / hàng ngoài danh mục) thì phải duyệt trước khi gửi.
import { z } from 'zod';
import { customValuesSchema } from '@appchat/shared';
import { defineAction } from './define';
import { discount, docChannel, lineItem } from './sales-schemas';

const quoteId = z.string().min(1);
const fields = z.object({
  contact_id: z.string().min(1),
  owner_user_id: z.string().optional(),
  items: z.array(lineItem).min(1),
  header_discount: discount.nullable().optional(),
  valid_days: z.number().int().min(1).max(90).optional(),
  payment_terms: z.string().max(2000).optional(),
  note: z.string().max(2000).optional(),
  gift: z.string().max(200).optional(),
  /** Trường tuỳ biến (D56) — validate theo định nghĩa ở Executor. */
  custom: customValuesSchema.optional(),
});
const out = z.object({ quote_id: z.string(), code: z.string() });
const opened = (o: { quote_id: string }) => ({
  type: 'open' as const,
  entity: 'quote',
  id: o.quote_id,
  view: 'drawer' as const,
});

export const quoteCreate = defineAction({
  id: 'quote.create',
  module: 'sales',
  title: 'actions.quote.create.title',
  description:
    'Create a draft quote (unit prices exclude VAT, tax per line after discount). Example: {"contact_id":"ct_lan","items":[{"name":"HIFU nâng cơ","qty":8,"unit_price":"1500000","tax_rate":8}],"header_discount":{"kind":"pct","value":5}}',
  input: fields,
  output: out,
  permission: 'quote.create',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes'],
  uiTarget: opened,
});

export const quoteUpdate = defineAction({
  id: 'quote.update',
  module: 'sales',
  title: 'actions.quote.update.title',
  description:
    'Edit a quote while it is draft / revision_requested (lines, discount, note). Example: {"quote_id":"q_2039","patch":{"header_discount":{"kind":"pct","value":5}}}',
  input: z.object({ quote_id: quoteId, patch: fields.partial() }),
  output: z.object({ quote_id: z.string() }),
  permission: 'quote.create',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['quotes'],
});

export const quoteDelete = defineAction({
  id: 'quote.delete',
  module: 'sales',
  title: 'actions.quote.delete.title',
  description: 'Delete a draft quote that was never sent. Example: {"quote_id":"q_2039"}',
  input: z.object({ quote_id: quoteId }),
  output: z.object({ quote_id: z.string() }),
  permission: 'quote.create',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes'],
});

export const quoteSubmit = defineAction({
  id: 'quote.submit_for_approval',
  module: 'sales',
  title: 'actions.quote.submit_for_approval.title',
  description:
    'Send a quote over the approval threshold to the approver (draft → pending_approval). Example: {"quote_id":"q_2039"}',
  input: z.object({ quote_id: quoteId }),
  output: z.object({ quote_id: z.string(), status: z.string() }),
  permission: 'quote.create',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['quotes'],
});

export const quoteApprove = defineAction({
  id: 'quote.approve',
  module: 'sales',
  title: 'actions.quote.approve.title',
  description:
    'Approve a quote waiting for approval (pending_approval → approved). Example: {"quote_id":"q_2039"}',
  input: z.object({ quote_id: quoteId }),
  output: z.object({ quote_id: z.string(), status: z.string() }),
  permission: 'quote.approve',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['quotes'],
});

export const quoteRejectInternal = defineAction({
  id: 'quote.reject_internal',
  module: 'sales',
  title: 'actions.quote.reject_internal.title',
  description:
    'Reject a quote at internal approval; it goes back to draft. Example: {"quote_id":"q_2039","reason":"Chiết khấu quá cao"}',
  input: z.object({ quote_id: quoteId, reason: z.string().max(500).optional() }),
  output: z.object({ quote_id: z.string(), status: z.string() }),
  permission: 'quote.approve',
  risk: 'money',
  agentGrantable: false,
  invalidates: ['quotes'],
});

export const quoteSend = defineAction({
  id: 'quote.send',
  module: 'sales',
  title: 'actions.quote.send.title',
  description:
    'Send the quote to the customer over a channel (zalo_personal | email | webchat) as a PDF (default) or page images (format: "image"); sets valid_until = sent_at + valid_days. Fails with QUOTE_NEEDS_APPROVAL over threshold. Example: {"quote_id":"q_2041","channel":"zalo_personal"}',
  // format: PDF (mặc định) hoặc ảnh từng trang render từ cùng PDF đóng băng (COMMERCE §3 "PDF hoặc ảnh" — TIP-032b P2).
  input: z.object({ quote_id: quoteId, channel: docChannel, format: z.enum(['pdf', 'image']).default('pdf') }),
  output: z.object({ quote_id: z.string(), valid_until: z.string() }),
  permission: 'quote.send',
  risk: 'send',
  agentGrantable: true,
  invalidates: ['quotes', 'crm'],
});

export const quoteRequestRevision = defineAction({
  id: 'quote.request_revision',
  module: 'sales',
  title: 'actions.quote.request_revision.title',
  description:
    'Customer asked for changes: create version n+1 as a new draft, the current version becomes superseded. Example: {"quote_id":"q_2040","reason":"Khách xin bớt"}',
  input: z.object({ quote_id: quoteId, reason: z.string().max(500).optional() }),
  output: z.object({ quote_id: z.string(), code: z.string(), version: z.number() }),
  permission: 'quote.create',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['quotes'],
  uiTarget: opened,
});

export const quoteMarkAccepted = defineAction({
  id: 'quote.mark_accepted',
  module: 'sales',
  title: 'actions.quote.mark_accepted.title',
  description: 'Customer accepted the quote (sent / viewed → accepted). Example: {"quote_id":"q_2040"}',
  input: z.object({ quote_id: quoteId }),
  output: z.object({ quote_id: z.string(), status: z.string() }),
  permission: 'quote.send',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes', 'crm'],
});

export const quoteMarkRejected = defineAction({
  id: 'quote.mark_rejected',
  module: 'sales',
  title: 'actions.quote.mark_rejected.title',
  description: 'Customer declined the quote. Example: {"quote_id":"q_2040","reason":"Giá cao"}',
  input: z.object({ quote_id: quoteId, reason: z.string().max(500).optional() }),
  output: z.object({ quote_id: z.string(), status: z.string() }),
  permission: 'quote.send',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes', 'crm'],
});

export const quoteExtendValidity = defineAction({
  id: 'quote.extend_validity',
  module: 'sales',
  title: 'actions.quote.extend_validity.title',
  description: 'Extend validity of a sent quote by N days. Example: {"quote_id":"q_2040","days":7}',
  input: z.object({ quote_id: quoteId, days: z.number().int().min(1).max(60) }),
  output: z.object({ quote_id: z.string(), valid_until: z.string() }),
  permission: 'quote.send',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes'],
});

export const quoteComment = defineAction({
  id: 'quote.comment',
  module: 'sales',
  title: 'actions.quote.comment.title',
  description:
    'Add an internal comment on a quote (sales / accounting / manager; never sent to the customer). Example: {"quote_id":"q_2041","text":"Khách đồng ý nâng combo"}',
  input: z.object({ quote_id: quoteId, text: z.string().trim().min(1).max(2000) }),
  output: z.object({ quote_id: z.string() }),
  permission: 'quote.view',
  risk: 'write',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes'],
});

export const quoteDraftFromContent = defineAction({
  id: 'quote.draft_from_content',
  module: 'sales',
  title: 'actions.quote.draft_from_content.title',
  description:
    'AI drafts a quote from free text (note, chat excerpt, brief): lines matched to the catalog, prices from the catalog; off-catalog lines or discount > 5% force approval. Draft only. Example: {"contact_id":"ct_lan","content":"Chị Lan lấy HIFU 8 buổi + 2 buổi chăm sóc da, giảm 5%"}',
  input: z.object({ contact_id: z.string().min(1), content: z.string().trim().min(1).max(8000) }),
  output: z.object({ quote_id: z.string(), code: z.string(), off_catalog: z.number() }),
  permission: 'quote.create',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['quotes'],
  uiTarget: opened,
});
