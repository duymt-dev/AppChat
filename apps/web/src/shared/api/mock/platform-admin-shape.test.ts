// TIP-040: route mock Quản trị nền tảng đúng shape đọc dùng chung với API thật (packages/shared/src/api/platform-admin.ts); action mock
// giữ CAS như server (if_version cũ → 409).
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  adminBankTxSchema,
  adminInquirySchema,
  adminPlanSchema,
  adminPriceSchema,
  adminProviderSchema,
  adminRouteGroupSchema,
  adminSessionSchema,
  adminTemplateSchema,
  adminTransferSchema,
  adminWorkspaceSchema,
} from '@appchat/shared';
import { mockTransport } from './mock-transport';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);
const cursored = <T extends z.ZodTypeAny>(s: T) => z.object({ data: z.array(s), next_cursor: z.string().nullable() });

describe('mock platform-admin — shape FE ↔ BE', () => {
  it.each([
    ['/admin/session', adminSessionSchema],
    ['/admin/workspaces', cursored(adminWorkspaceSchema)],
    ['/admin/config/plans', z.array(adminPlanSchema)],
    ['/admin/config/providers', z.array(adminProviderSchema)],
    ['/admin/config/routes', z.array(adminRouteGroupSchema)],
    ['/admin/config/prices', z.array(adminPriceSchema)],
    ['/admin/config/templates', z.array(adminTemplateSchema)],
    ['/admin/transfers', cursored(adminTransferSchema)],
    ['/admin/bank-transactions', cursored(adminBankTxSchema)],
    ['/admin/sales-inquiries', cursored(adminInquirySchema)],
  ] as const)('GET %s', async (path, schema) => {
    expect(issues(schema.safeParse(await mockTransport.get(path)))).toEqual([]);
  });

  it('tạm dừng → mở lại theo phiên bản; if_version cũ → 409', async () => {
    const page = (await mockTransport.get('/admin/workspaces')) as { data: { id: string; version: number }[] };
    const w = page.data[0]!;
    await mockTransport.action('admin.workspace.suspend', { workspace_id: w.id, if_version: w.version, reason: 'nợ phí' });
    const after = (await mockTransport.get('/admin/workspaces', { status: 'suspended' })) as typeof page;
    expect(after.data.map((x) => x.id)).toContain(w.id);
    await expect(mockTransport.action('admin.workspace.resume', { workspace_id: w.id, if_version: w.version })).rejects.toMatchObject({ status: 409 });
    await mockTransport.action('admin.workspace.resume', { workspace_id: w.id, if_version: w.version + 1 });
  });
});
