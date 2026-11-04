// Trí nhớ khách (TIP-015b, Blueprint §2.2 `contact_memory`, §5.3): `contact.remember` ghi một điều về khách (sở thích, dị ứng, lịch quen…)
// — trùng văn bản sau chuẩn hoá (trigram ≥ 0.9) thì làm mới, không thêm dòng; tối đa 50 fact / khách (đầy → bỏ fact tin cậy thấp nhất, cũ nhất).
// Không nhận CCCD / số thẻ / mật khẩu. Nguồn (run / bước / người ghi) lấy từ ngữ cảnh server, không từ input. `contact.memory_forget` xoá
// một fact (hoàn tác 24h, không vượt trần 50).
import { z } from 'zod';
import { defineAction } from './define';

/** Một fact trí nhớ (đọc — khối "AI ghi nhớ", Trợ lý tra id để xoá). Nguồn: agent / người ghi, không lộ run nội bộ. */
const memoryFact = z.object({
  memory_id: z.string(),
  fact: z.string(),
  confidence: z.number(),
  source: z.enum(['agent', 'user', 'system']),
  updated_at: z.string(),
});

export const contactMemoryList = defineAction({
  id: 'contact.memory_list',
  module: 'crm',
  title: 'actions.contact.memory_list.title',
  description: 'List what the AI remembers about one customer (newest first, max 50) with memory ids — to forget a specific fact. Example: {"contact_id":"KH-1016"}',
  input: z.object({ contact_id: z.string().min(1) }),
  output: z.object({ items: z.array(memoryFact), cap: z.number().int(), can_edit: z.boolean() }),
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const contactRemember = defineAction({
  id: 'contact.remember',
  module: 'crm',
  title: 'actions.contact.remember.title',
  description:
    'Remember one durable fact about the customer (preference, allergy, usual schedule…) for future conversations. One short sentence; never ID numbers, card numbers or passwords. Same fact again only refreshes it. Example: {"contact_id":"…","fact":"Dị ứng tinh dầu sả","confidence":0.9}',
  input: z.object({
    contact_id: z.string().min(1),
    fact: z.string().trim().min(1).max(1000),
    confidence: z.number().finite().min(0).max(1).optional(),
  }),
  output: z.object({ memory_id: z.string(), status: z.enum(['created', 'refreshed']), evicted_id: z.string().nullable() }),
  permission: 'crm.edit',
  risk: 'write',
  agentGrantable: true,
  invalidates: ['crm'],
});

export const contactMemoryForget = defineAction({
  id: 'contact.memory_forget',
  module: 'crm',
  title: 'actions.contact.memory_forget.title',
  description: 'Delete one remembered fact about a customer (undo within 24h). Example: {"memory_id":"…"}',
  input: z.object({ memory_id: z.string().min(1) }),
  output: z.object({ memory_id: z.string(), contact_id: z.string() }),
  permission: 'crm.edit',
  risk: 'delete',
  agentGrantable: false,
  undo: { windowSec: 86_400 },
  invalidates: ['crm'],
});

export const contactSummarize = defineAction({
  id: 'contact.summarize',
  module: 'crm',
  title: 'actions.contact.summarize.title',
  description:
    'Summarise one customer in 3–5 bullets from what the caller may see (memory, timeline, receivables, contracts, orders, appointments, tickets). Cached per viewer scope; `refresh` regenerates once. Example: {"contact_id":"…"}',
  input: z.object({ contact_id: z.string().min(1), refresh: z.boolean().optional() }),
  output: z.object({
    bullets: z.array(z.string()),
    source: z.enum(['model', 'rule']),
    status: z.enum(['fresh', 'cached', 'retry']),
    generated_at: z.string(),
  }),
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  skill: true,
  invalidates: [],
});
