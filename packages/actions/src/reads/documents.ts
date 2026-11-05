// Action đọc mẫu chứng từ / mẫu hồ sơ / liệu trình cho Trợ lý (TIP-023b R2 · DC-224 · SPEC A). Mẫu chứng từ: quyền như GET /doc-templates
// (`documents.manage`); không trả HTML / tệp DOCX / bản đồ ô. Mẫu hồ sơ 360°: `settings.manage` như Cài đặt. Liệu trình của khách:
// `package.manage`, áp scope bán hàng qua khách.
import { z } from 'zod';
import { defineAction } from '../define';

const limit = z.number().int().min(1).max(20).optional();

export const docTemplateSearch = defineAction({
  id: 'doc_template.search',
  module: 'documents',
  title: 'actions.doc_template.search.title',
  description: 'Find document templates (quote / contract / payment request) by name or kind; returns template_id, version and default flag. Example: {"kind":"contract"}',
  input: z.object({ q: z.string().trim().max(80).optional(), kind: z.enum(['quote', 'contract', 'payment_request', 'receipt']).optional(), limit }),
  output: z.object({ templates: z.array(z.object({ id: z.string(), name: z.string(), kind: z.string(), version: z.number().int(), is_default: z.boolean() })) }),
  permission: 'documents.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const profileLayoutSearch = defineAction({
  id: 'profile_layout.search',
  module: 'settings',
  title: 'actions.profile_layout.search.title',
  description: 'List customer-360 profile layouts by name; returns layout_id and whether it is a system layout. Example: {"q":"bán hàng"}',
  input: z.object({ q: z.string().trim().max(60).optional(), limit }),
  output: z.object({ layouts: z.array(z.object({ id: z.string(), name: z.string(), is_system: z.boolean() })) }),
  permission: 'settings.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const packageSearch = defineAction({
  id: 'package.search',
  module: 'sales',
  title: 'actions.package.search.title',
  description: 'Find a customer’s treatment packages (sessions used / total, expiry, status); returns package_id. Example: {"contact_id":"KH-1016"}',
  input: z.object({ contact_id: z.string().min(1), status: z.enum(['active', 'exhausted', 'expired', 'refunded']).optional(), limit }),
  output: z.object({ packages: z.array(z.object({ id: z.string(), name: z.string(), used_sessions: z.number().int(), total_sessions: z.number().int(), expires_at: z.string().nullable(), status: z.string() })) }),
  permission: 'package.manage',
  risk: 'read',
  agentGrantable: true,
  invalidates: [],
});
