// Metadata form + thăm dò connector (TIP-023c G3, DEF-012-1): `integration.form_schema` trả trường form theo `ConnectorManifest.auth.fields`
// (key / secret / optional / kiểu / ràng buộc) — KHÔNG giá trị credential, không schema thực thi được; GenUI gọi trước khi dựng form
// connector. `integration.test` kiểm thông tin đăng nhập qua `adapter.test` (≤ 10 giây) mà KHÔNG lưu kết nối / credential: bản nháp
// (provider + fields, ô bí mật qua đường bí mật — executor che) hoặc kết nối hiện có của workspace. Cả hai: integrations.manage, risk read,
// agentGrantable=false, không đổi kết nối.
import { z } from 'zod';
import { authFieldSchema } from '@appchat/shared';
import { defineAction } from './define';


export const integrationFormSchema = defineAction({
  id: 'integration.form_schema',
  module: 'integrations',
  title: 'actions.integration.form_schema.title',
  description: 'Read the connection form of a provider (field keys, which are secret / optional) before building a connect form. Never returns credential values. Example: {"provider":"sepay"}',
  input: z.object({ provider: z.string().min(1).max(60) }),
  output: z.object({
    provider: z.string(),
    name: z.string(),
    status: z.enum(['ga', 'beta', 'coming_soon']),
    auth_kind: z.string(),
    fields: z.array(authFieldSchema),
    testable: z.boolean(),
  }),
  permission: 'integrations.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
});

export const integrationTest = defineAction({
  id: 'integration.test',
  module: 'integrations',
  title: 'actions.integration.test.title',
  description:
    'Check provider credentials without saving anything: either draft fields from a connect form, or the existing connection of the workspace. Returns ok / failed / unsupported. Example: {"provider":"sepay","fields":{"account_number":"…"}}',
  input: z.object({ provider: z.string().min(1).max(60), fields: z.record(z.string(), z.string().max(2000)).optional() }),
  output: z.object({ status: z.enum(['ok', 'failed', 'unsupported', 'not_connected']), reason: z.string().optional() }),
  permission: 'integrations.manage',
  risk: 'read',
  agentGrantable: false,
  invalidates: [],
  secret: { connector: { provider: 'provider', fields: 'fields' } },
});
