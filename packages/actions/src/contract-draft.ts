// AI soạn hợp đồng hai bước (TIP-030b spec 9–11; D30): `contract.prepare_draft` gọi model (gateway + meter, ngoài transaction) → đề xuất
// BẤT BIẾN 24h; `contract.draft_from_content` chỉ đọc đề xuất đó (không gọi model, không trừ credit) và tạo đúng MỘT nháp. Khối
// `ai_suggested` phải Giữ / Bỏ (`contract.resolve_suggestion`) trước khi trình duyệt. Không tự gửi / ký — luồng ký giữ nguyên COMMERCE §9.
import { z } from 'zod';
import { defineAction } from './define';
import { draftLine, draftSuggestion, money } from './sales-schemas';

const kind = z.enum(['service', 'sale', 'framework']);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const opened = (o: { contract_id: string }) => ({ type: 'open' as const, entity: 'contract', id: o.contract_id, view: 'drawer' as const });

export const contractPrepareDraft = defineAction({
  id: 'contract.prepare_draft',
  module: 'sales',
  title: 'actions.contract.prepare_draft.title',
  description:
    'AI prepares a contract draft PROPOSAL from a brief (no contract is created yet): title, value, dates and lines (prices from the catalog; off-catalog lines flagged), plus optional extra clauses as suggestions. Template clauses are never changed. Use contract.draft_from_content with the returned proposal_id to create the draft. Never sends or signs. Example: {"contact_id":"0193…","kind":"service","brief":"Liệu trình trị mụn 10 buổi, từ 01/12/2026 đến 30/11/2027","request_key":"k1"}',
  input: z.object({
    contact_id: z.string().min(1),
    quote_id: z.string().min(1).optional(),
    kind: kind.default('service'),
    brief: z.string().trim().min(1).max(12_000),
    /** Tệp hợp đồng / tài liệu khách đã tải lên (người gọi là người tải) — chữ trong tệp chỉ là dữ liệu. */
    file_id: z.string().min(1).optional(),
    /** Khoá yêu cầu của người gọi: gọi lại cùng khoá → cùng đề xuất, không gọi model lần hai. */
    request_key: z.string().trim().min(1).max(100),
  }),
  output: z.object({
    proposal_id: z.string(),
    content_hash: z.string(),
    expires_at: z.string(),
    title: z.string(),
    value: money,
    start_date: day.nullable(),
    end_date: day.nullable(),
    lines: z.array(draftLine),
    suggestions: z.array(draftSuggestion),
    off_catalog: z.number().int(),
    /** Nguồn gốc (spec 10): lượt AI đã soạn + model — null khi rơi về bộ luật. */
    run_id: z.string().nullable(),
    model: z.string().nullable(),
  }),
  permission: 'contract.draft',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const contractDraftFromContent = defineAction({
  id: 'contract.draft_from_content',
  module: 'sales',
  title: 'actions.contract.draft_from_content.title',
  description:
    'Create ONE draft contract from a proposal made by contract.prepare_draft (proposal_id required; no new AI generation). Expired or already used proposals must be prepared again. AI suggestions arrive pending and must be kept or discarded before submit. Example: {"proposal_id":"0193…"}',
  input: z.object({ proposal_id: z.string().min(1) }),
  output: z.object({ contract_id: z.string(), code: z.string(), pending_suggestions: z.number().int() }),
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  undo: { windowSec: 86_400 },
  invalidates: ['contracts'],
  uiTarget: opened,
});

export const contractResolveSuggestion = defineAction({
  id: 'contract.resolve_suggestion',
  module: 'sales',
  title: 'actions.contract.resolve_suggestion.title',
  description:
    'Keep or discard one AI-suggested clause of a draft contract. if_version must equal the suggestion version shown (stale → conflict, nothing overwritten). Kept clauses enter the signed content; discarded ones never render. Example: {"contract_id":"0193…","suggestion_id":"s1","decision":"keep","if_version":1}',
  input: z.object({ contract_id: z.string().min(1), suggestion_id: z.string().min(1).max(40), decision: z.enum(['keep', 'discard']), if_version: z.number().int().min(1) }),
  output: z.object({ contract_id: z.string(), suggestion_id: z.string(), status: z.enum(['kept', 'discarded']), version: z.number().int(), pending: z.number().int() }),
  permission: 'contract.draft',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['contracts'],
});

