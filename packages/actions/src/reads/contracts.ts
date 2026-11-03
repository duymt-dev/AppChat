// Action đọc hợp đồng cho Trợ lý / agent (TIP-023b R2 · DC-224): cùng repo + scope màn Hợp đồng (`listContractIds`, `visibleContract`).
// Không trả file / link ký / token ký — chỉ id, mã, tiêu đề, giá trị (string VND), trạng thái, ngày.
import { z } from 'zod';
import { defineAction } from '../define';

const contractHit = z.object({
  id: z.string(),
  code: z.string(),
  number: z.string(),
  title: z.string(),
  contact_id: z.string(),
  contact: z.string(),
  status: z.string(),
  value: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
});

export const contractSearch = defineAction({
  id: 'contract.search',
  module: 'sales',
  title: 'actions.contract.search.title',
  description: 'Find contracts by code / number / title, customer, or chip (draft, pending, signed, expired). Example: {"contact_id":"KH-1016"} or {"q":"HD-1002"}',
  input: z.object({ q: z.string().trim().max(120).optional(), contact_id: z.string().optional(), status: z.enum(['draft', 'pending', 'signed', 'expired']).optional(), limit: z.number().int().min(1).max(20).optional() }),
  output: z.object({ contracts: z.array(contractHit), total: z.number().int() }),
  permission: 'contract.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});

export const contractGet = defineAction({
  id: 'contract.get',
  module: 'sales',
  title: 'actions.contract.get.title',
  description: 'Get one contract: status, value, dates, signing progress and linked quote. Accepts id or code. Example: {"contract_id":"HD-1002"}',
  input: z.object({ contract_id: z.string().min(1) }),
  output: contractHit.extend({ kind: z.string(), quote_id: z.string().nullable(), signed_by_business_at: z.string().nullable(), signed_by_customer_at: z.string().nullable(), sent_at: z.string().nullable() }),
  permission: 'contract.view',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
  uiTarget: (o) => ({ type: 'open', entity: 'contract', id: o.id, view: 'drawer' }),
});
