// TIP-003e §5 (AC8) — contract ĐỌC FE ↔ BE trên HTTP thật: mỗi route GET trong `tools/obligations/routes.json` hoặc có dòng trong bảng
// dưới (response thật parse đúng zod dùng chung `@appchat/shared` — cùng schema mock FE dùng ở `apps/web/src/shared/api/mock/*-shape.test.ts`),
// hoặc có lý do ở UNTYPED (tệp nhị phân / stream / route nền tảng / đã có contract riêng). Route GET mới mà quên cả hai → file này đỏ;
// đổi field DTO ở core mà không cập nhật schema shared → parse đỏ. Body đọc như `httpTransport.get`: có `next_cursor` → cả body, còn lại `data`.
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as S from '@appchat/shared';
import { uuidv7 } from '@appchat/core';
import { call, startApi, type Harness } from './setup';

const ROUTES = JSON.parse(readFileSync(join(import.meta.dirname, '..', '..', '..', '..', 'tools', 'obligations', 'routes.json'), 'utf8')) as { api: Record<string, string> };
const GETS = Object.keys(ROUTES.api).filter((k) => k.startsWith('GET '));

/** Route không tham số → schema của phần FE nhận (sau khi httpTransport bóc envelope). */
const LIST: Record<string, z.ZodType> = {
  '/agents': z.object({ data: z.array(S.agentSchema), next_cursor: z.string().nullable() }),
  // FE (agents/api.ts) đọc `{ data, total }` — envelope `{ data: { data, total } }`, không phân trang con trỏ.
  '/agent-templates': z.object({ data: z.array(S.agentTemplateSchema), total: z.number().int() }),
  '/approvals': z.object({ data: z.array(S.approvalRowSchema), next_cursor: z.string().nullable() }),
  '/settings/governance': S.governanceSchema,
  '/governance': S.governanceSchema,
  '/settings/ai': S.aiSettingsSchema,
  '/runs': S.runsListSchema,
  '/settings/kb': S.kbDataSchema,
  '/assistant/home': S.assistantHomeSchema,
  '/action-logs': S.actionLogsPageSchema,
  '/kb/suggestions': S.kbSuggestionListSchema,
  '/ai-tasks': S.aiTasksPayloadSchema,
  '/teams': S.teamsSchema,
  '/billing/summary': S.billingSummarySchema,
  '/billing/plans': S.billingCatalogSchema,
  '/billing/wallet': S.walletSchema,
  '/billing/ledger': S.ledgerPageSchema,
  '/billing/invoices': S.billInvoicesPageSchema,
  '/calendar/meta': S.calendarMetaSchema,
  '/settings/booking': S.bookingSettingsSchema,
  '/products': S.productsPageSchema,
  '/products/meta': S.productsMetaSchema,
  '/categories': S.categoriesSchema,
  '/settings/channels': S.settingsChannelListSchema,
  '/settings/lead-routing': S.leadRoutingSchema,
  '/settings/widget': S.widgetSettingsSchema,
  '/contracts': S.contractsPageSchema,
  '/contracts/meta': S.contractsMetaSchema,
  '/contacts': S.contactsPageSchema,
  '/contacts/board': S.contactsBoardSchema,
  '/contacts/stats': S.crmStatsSchema,
  '/contacts/duplicates': S.duplicatesSchema,
  '/contact-access-requests': S.accessRequestsSchema,
  '/members': S.membersListSchema,
  '/settings/fields': S.fieldsDataSchema,
  '/settings/profile-layouts': S.profileLayoutsSchema,
  '/doc-templates': S.docTemplatesListSchema,
  '/session': S.sessionSchema,
  '/workspace/provisioning': S.provisioningSchema,
  '/auth/brand': S.authBrandSchema,
  '/settings/workspace': S.workspaceSettingsSchema,
  '/settings/roles': S.settingsRolesSchema,
  '/me': S.meSchema,
  '/conversations': S.conversationsPageSchema,
  '/conversations/counts': S.folderCountsSchema,
  '/inbox/accounts': S.inboxAccountsSchema,
  '/inbox/channels': S.inboxChannelsSchema,
  '/inbox/connect-channels': S.connectChannelsSchema,
  '/canned-replies': S.cannedGroupsSchema,
  '/tags': S.tagOptionsSchema,
  '/settings/tags': S.settingsTagsSchema,
  '/settings/replies': S.settingsRepliesSchema,
  '/dashboard': S.dashboardSchema,
  '/settings/integrations': S.connectorListSchema,
  '/settings/audit': z.array(S.auditRowSchema),
  '/settings/ai-audit': z.array(S.aiAuditRowSchema),
  '/loyalty/config': S.loyaltyConfigSchema,
  '/loyalty/members': S.loyaltyMembersPageSchema,
  '/loyalty/overview': S.loyaltyOverviewSchema,
  '/notifications': S.notificationListSchema,
  '/settings/notifications': S.notifyPrefsSchema,
  '/settings/sales-policy': S.salesPolicySchema,
  '/invoices': S.invoicesPageSchema,
  '/invoices/meta': S.invoicesMetaSchema,
  '/settings/payments': S.paymentSettingsSchema,
  '/orders': S.ordersPageSchema,
  '/orders/meta': S.ordersMetaSchema,
  '/quotes': S.quotesPageSchema,
  '/quotes/meta': S.quotesMetaSchema,
  '/tickets': S.ticketsPageSchema,
  '/tickets/meta': S.ticketsMetaSchema,
  '/settings/sla': S.slaSettingsSchema,
};

/** Route cần query bắt buộc (không có tham số đường dẫn) — đường dẫn đầy đủ. */
const QUERY: Record<string, { path: string; schema: z.ZodType }> = {
  'GET /calendar': { path: '/calendar?from=2026-11-14&to=2026-11-20', schema: S.appointmentsPageSchema },
};

/** Route có tham số: đường dẫn cụ thể dựng từ dữ liệu seed (`{t}` ticket · `{p}` sản phẩm · `{c}` khách · …). */
const DETAIL: Record<string, { path: string; schema: z.ZodType }> = {
  'GET /agents/:p': { path: '/agents/{a}', schema: S.agentSchema },
  'GET /agents/:p/versions': { path: '/agents/{a}/versions', schema: z.object({ data: z.array(S.agentVersionSchema), next_cursor: z.string().nullable() }) },
  'GET /agents/:p/tools': { path: '/agents/{a}/tools', schema: S.agentToolsSchema },
  'GET /agents/:p/stats': { path: '/agents/{a}/stats', schema: S.agentStatsSchema },
  'GET /tickets/:p': { path: '/tickets/{t}', schema: S.ticketRowSchema },
  'GET /products/:p': { path: '/products/{p}', schema: S.productRowSchema },
  'GET /products/:p/activity': { path: '/products/{p}/activity', schema: S.productActivitySchema },
  'GET /contacts/:p/collaborators': { path: '/contacts/{c}/collaborators', schema: S.collaboratorsSchema },
  'GET /contacts/:p/memory': { path: '/contacts/{c}/memory', schema: S.contactMemorySchema },
  'GET /contacts/:p/timeline': { path: '/contacts/{c}/timeline', schema: S.timelinePageSchema },
  'GET /contacts/:p/packages': { path: '/contacts/{c}/packages', schema: S.customerPackagesPageSchema },
  'GET /orders/:p': { path: '/orders/{o}', schema: S.orderRowSchema },
  'GET /invoices/:p': { path: '/invoices/{i}', schema: S.invoiceRowSchema },
  'GET /quotes/:p': { path: '/quotes/{q}', schema: S.quoteRowSchema },
  'GET /loyalty/members/:p': { path: '/loyalty/members/{c}', schema: S.loyaltyMemberSchema },
  'GET /loyalty/members/:p/ledger': { path: '/loyalty/members/{c}/ledger', schema: S.loyaltyLedgerPageSchema },
  'GET /loyalty/members/:p/files': { path: '/loyalty/members/{c}/files', schema: z.array(S.loyaltyMemberFileSchema) },
};

/** Không parse bằng DTO chung — lý do bắt buộc (không có ô "bỏ qua" ngầm). */
const UNTYPED: Record<string, string> = {
  'GET /health': 'probe vận hành (TIP-035d instance) — không phải DTO FE',
  'GET /metrics': 'Prometheus text — ops',
  'GET /docs': 'OpenAPI JSON sinh tự động — tự là contract',
  'GET /docs/ui': 'HTML Swagger UI',
  'GET /widget.js': 'tệp JS widget nhúng (TIP-017)',
  'GET /actions': 'danh mục action sinh từ registry (packages/actions) — chính là nguồn schema',
  'GET /me/authz': 'quyền hiệu lực — FE dùng type AuthzContext; đo ở authz-management.contract.test.ts',
  'GET /roles': 'quản lý vai trò — authz-management.contract.test.ts',
  'GET /permissions': 'danh mục quyền tĩnh (PERMISSION_GROUPS) — authz-management.contract.test.ts',
  'GET /admin/transfers': 'route quản trị nền tảng (platform_admin) — không thuộc app workspace',
  'GET /agents/meta': 'meta Builder chưa có schema chung (type FE AgentsMeta) — kiểm ở agents-ui.test.ts',
  'GET /agents/channel-binding-preview': 'đo ở agent-channel-config.test.ts (channelBindingPreviewSchema)',
  'GET /assistant/sessions': 'đo ở assistant.test.ts (assistantSessionSchema)',
  'GET /calendar/slots': 'cần tham số dịch vụ / ngày — đo ở booking.test.ts (slotsSchema)',
  'GET /contacts/import-table': 'cần file_id tệp nhập đã tải — crm-import test (importTableSchema)',
  'GET /crm/ai': 'gợi ý AI CRM — đo ở crm-contacts.test.ts',
  'GET /settings/members': 'đo ở members.test.ts (settingsMemberSchema)',
  'GET /loyalty/lookup': 'cần SĐT — loyalty.contract.test.ts',
  'GET /campaigns': 'marketing-contract.test.ts',
  'GET /campaigns/meta': 'marketing-contract.test.ts',
  'GET /segments': 'marketing.test.ts (segmentDtoSchema)',
  'GET /campaign-suggestions': 'marketing-analytics.test.ts',
};
/** Route có tham số không dựng trong file này: tệp / stream / public token / việc nền — mỗi nhóm một lý do. */
const UNTYPED_PARAM: [RegExp, string][] = [
  [/\/(pdf|raw|download|stream)$|\/qr\/:p$|\/qr$|\/files\/:p$/, 'tệp nhị phân / stream (kể cả tải tệp đính kèm theo id) — không phải JSON DTO'],
  [/^GET \/public\//, 'trang công khai theo token — contracts / quotes / documents test riêng'],
  [/^GET \/(data-jobs|product-imports|inbox\/channel-operations|settings\/channels\/:p\/(friends|lookups|contact-syncs|syncs|login|stats))/, 'việc nền / kênh theo id — test domain (data-jobs, product-import, channel-operations)'],
  [/^GET \/(contracts\/:p|kb\/|billing\/invoices\/:p|calendar\/:p|conversations\/:p|conversation-groups|groups|insights|campaigns\/:p|campaign-analyses|workspaces\/:p|business-lookup|files\/:p|assistant\/|doc-templates\/:p|contacts\/:p$|quotes\/:p\/versions|invoices\/receipts)/, 'chi tiết theo id có contract ở test domain (contracts, kb, inbox, insights, marketing, assistant, crm)'],
];

let h: Harness;
const ids: Record<string, string> = {};
const json = async (r: Response) => ({ status: r.status, body: (await r.json()) as { data: unknown; next_cursor?: unknown; error?: unknown } });
const ok = async (id: string, input: unknown) => {
  const r = await json(await call(h, `/actions/${id}`, { input }, { 'idempotency-key': uuidv7() }));
  if (r.status !== 200) throw new Error(`${id} ${r.status} ${JSON.stringify(r.body).slice(0, 300)}`);
  return (r.body.data as { result: Record<string, string> }).result;
};
/** Như httpTransport.get: có `next_cursor` → cả body; còn lại → `data`. */
const fe = (b: { data: unknown; next_cursor?: unknown }) => ('next_cursor' in b ? b : b.data);
const issues = (s: z.ZodType, v: unknown) => {
  const r = s.safeParse(v);
  return r.success ? [] : r.error.issues.slice(0, 4).map((i) => `${i.path.join('.')}: ${i.message}`);
};

beforeAll(async () => {
  h = await startApi();
  const team = await h.platform.plan.findUniqueOrThrow({ where: { key: 'team' } });
  await h.platform.subscription.create({ data: { id: uuidv7(), workspaceId: h.ws, planId: team.id, status: 'active', currentPeriodStart: h.clock.now() } });
  ids.c = (await ok('contact.create', { full_name: 'Chị Lan Shape', phone: '0909622001' })).contact_id!;
  ids.p = (await ok('product.create', { name: 'Serum Shape', type: 'physical', price: '300000', stock: 4 })).product_id!;
  ids.t = (await ok('ticket.create', { title: 'Shape ticket', channel: 'zalo_personal', category: 'Refund', priority: 'high', contact_id: ids.c })).ticket_id!;
  ids.o = (await ok('order.create', { contact_id: ids.c, items: [{ product_id: ids.p, name: 'Serum Shape', qty: 1, unit_price: '300000', tax_rate: 0 }] })).order_id!;
  ids.i = (await ok('invoice.create', { order_id: ids.o, contact_id: ids.c, kind: 'full', amount: '300000' })).invoice_id!;
  ids.q = (await ok('quote.create', { contact_id: ids.c, items: [{ name: 'Gói Shape', qty: 1, unit_price: '500000', tax_rate: 0 }] })).quote_id!;
  ids.a = (await ok('agent.create_and_publish', { name: 'Agent Shape', role: 'cs', threshold: 70 })).agent_id!;
}, 240_000);
afterAll(async () => {
  await h?.close();
});

describe('route GET ↔ zod chung (AC8)', () => {
  it('mọi route GET trong routes.json có schema hoặc lý do', () => {
    const covered = (k: string) => (k.includes(':p') ? !!DETAIL[k] || UNTYPED_PARAM.some(([re]) => re.test(k)) : !!LIST[k.slice(4)] || !!QUERY[k] || !!UNTYPED[k]);
    expect(GETS.filter((k) => !covered(k))).toEqual([]);
    // Bảng không giữ route đã xoá.
    expect([...Object.keys(LIST).map((p) => `GET ${p}`), ...Object.keys(QUERY), ...Object.keys(DETAIL), ...Object.keys(UNTYPED)].filter((k) => !GETS.includes(k))).toEqual([]);
  });

  it.each(Object.entries(LIST))('GET %s', async (path, schema) => {
    const r = await json(await call(h, path));
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
    expect(issues(schema, fe(r.body))).toEqual([]);
  });

  it.each(Object.entries({ ...QUERY, ...DETAIL }))('%s', async (_k, d) => {
    const path = d.path.replace(/\{(\w)\}/g, (_m, k: string) => ids[k]!);
    const r = await json(await call(h, path));
    expect(r.status, JSON.stringify(r.body).slice(0, 300)).toBe(200);
    expect(issues(d.schema, fe(r.body))).toEqual([]);
  });

  it('đổi field DTO mà không cập nhật shared → parse đỏ (bằng chứng cơ chế)', async () => {
    const r = await json(await call(h, `/tickets/${ids.t}`));
    expect(issues(S.ticketRowSchema, r.body.data)).toEqual([]);
    // Mô phỏng core đổi tên field: schema chung vẫn đòi tên cũ → báo lỗi đúng đường dẫn.
    const { code, ...renamed } = r.body.data as { code: string };
    expect(issues(S.ticketRowSchema, { ...renamed, ticket_code: code })).toEqual(['code: Invalid input: expected string, received undefined']);
  });
});
