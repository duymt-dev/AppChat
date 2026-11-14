// TIP-045b A2: mock Audit / AI Audit đúng hợp đồng API (packages/shared/src/api/audit.ts) — không tham số → mảng; page=1 / lọc → trang.
import { describe, expect, it } from 'vitest';
import { aiAuditPageSchema, aiAuditRowSchema, auditPageSchema, auditRowSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';

describe('mock audit', () => {
  it('mảng cũ + trang; lọc bảo mật / trạng thái', async () => {
    const legacy = await mockTransport.get<unknown[]>('/settings/audit');
    expect(legacy).toHaveLength(7);
    for (const r of legacy) expect(auditRowSchema.safeParse(r).success).toBe(true);
    const p = auditPageSchema.parse(await mockTransport.get('/settings/audit', { page: '1' }));
    expect([p.data.length, p.next_cursor]).toEqual([7, null]);
    expect(auditPageSchema.parse(await mockTransport.get('/settings/audit', { action: 'security' })).data).toHaveLength(4);
    const ai = aiAuditPageSchema.parse(await mockTransport.get('/settings/ai-audit', { status: 'escalated' }));
    expect(ai.data.map((r) => r.actor)).toEqual(['cs']);
    for (const r of await mockTransport.get<unknown[]>('/settings/ai-audit')) expect(aiAuditRowSchema.safeParse(r).success).toBe(true);
  });
});
