// Chống trùng khách (TIP-015e §1.1): đọc ứng viên trùng theo scope hiện tại — cùng service với GET /v1/contacts/duplicates/candidates.
// Agent chỉ đọc khi được cấp tool (D51) — không bật mặc định. Gộp vẫn là `contact.merge` (không cấp cho agent).
import { z } from 'zod';
import { duplicateCandidatesPageSchema } from '@appchat/shared';
import { defineAction } from './define';

export const contactDuplicateCandidates = defineAction({
  id: 'contact.duplicate_candidates',
  module: 'crm',
  title: 'actions.contact.duplicate_candidates.title',
  description:
    'List possible duplicate customer pairs you can see (both sides in your scope), ranked by matching RULE (email + name > email > tax code > name) — a rule suggestion, never a probability or proof of the same person. Each row: key "<id>~<id>", evidence fields, suggested primary_id (older record), both sides with version. Use the key + chosen primary for contact.merge. Example: {"q":"Lan","limit":20}',
  input: z.object({ q: z.string().trim().max(200).optional(), cursor: z.string().max(400).optional(), limit: z.number().int().min(1).max(50).optional() }),
  output: duplicateCandidatesPageSchema,
  permission: 'crm.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
