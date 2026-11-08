// Runtime kết nối (TIP-012b P3 §4.2, §5.1): `integration.sync_now` xếp một lượt KÉO giao dịch cho kết nối đã có (không kết nối / đổi khoá /
// cấp quyền / đổi feed tài chính) → biên nhận lệnh `accepted` (≠ đã xong); cùng kết nối đang có lượt chờ → gộp vào lượt đó.
// `integration.get` / `integration.list_calls` đọc cùng reader với HTTP /v1/integrations/* để Trợ lý thấy đúng trạng thái biên nhận.
// Cả ba: integrations.manage, agentGrantable=false (không cấp cho agent — D51).
import { z } from 'zod';
import { callLogPageSchema, callReceiptSchema, connectionDetailSchema } from '@appchat/shared';
import { defineAction } from './define';

export const integrationSyncNow = defineAction({
  id: 'integration.sync_now',
  module: 'integrations',
  title: 'actions.integration.sync_now.title',
  description:
    'Queue a read-only pull of bank transactions for an existing connection (e.g. Casso with an API key). Returns an accepted call receipt — not a finished sync; check integration.get. Unsupported connectors return status unsupported. Example: {"connection_id":"0196c0de-0000-7000-8000-000000000001"}',
  input: z.object({ connection_id: z.string().uuid(), if_version: z.number().int().positive().optional() }),
  output: z.object({ status: z.enum(['accepted', 'unsupported']), call: callReceiptSchema.nullable(), reason: z.string().optional(), coalesced: z.boolean() }),
  permission: 'integrations.manage',
  risk: 'write',
  agentGrantable: false,
  invalidates: ['integrations'],
});

export const integrationGet = defineAction({
  id: 'integration.get',
  module: 'integrations',
  title: 'actions.integration.get.title',
  description: 'Read one connection: mode, health from real evidence (probe / pull), capabilities, last sync / event, pending call. Never returns secrets. Example: {"connection_id":"0196c0de-0000-7000-8000-000000000001"}',
  input: z.object({ connection_id: z.string().uuid() }),
  output: connectionDetailSchema,
  permission: 'integrations.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const integrationListCalls = defineAction({
  id: 'integration.list_calls',
  module: 'integrations',
  title: 'actions.integration.list_calls.title',
  description: 'List recent outbound calls of a connection (operation, status, safe reason, latency, time) — no request bodies or customer data. Example: {"connection_id":"0196c0de-0000-7000-8000-000000000001","limit":20}',
  input: z.object({ connection_id: z.string().uuid(), cursor: z.string().max(200).optional(), limit: z.number().int().min(1).max(50).optional() }),
  output: callLogPageSchema,
  permission: 'integrations.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});
