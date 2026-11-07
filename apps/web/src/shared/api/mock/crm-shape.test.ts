// TIP-015: route mock domain crm đúng shape đọc dùng chung với API thật (packages/shared/src/api/crm.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  accessRequestsSchema,
  collaboratorsSchema,
  contact360Schema,
  contactMemorySchema,
  contactsBoardSchema,
  contactsPageSchema,
  crmStatsSchema,
  importTableSchema,
  duplicatesSchema,
  fieldsDataSchema,
  membersListSchema,
  profileLayoutsSchema,
} from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { setMockRole } from './store';

const issues = (r: { success: boolean; error?: { issues: unknown[] } }) => (r.success ? [] : r.error!.issues);

describe('mock crm — shape FE ↔ BE', () => {
  beforeEach(() => setMockRole('owner'));

  it('GET /contacts (D42) + lọc', async () => {
    expect(issues(contactsPageSchema.safeParse(await mockTransport.get('/contacts', { page: 1, limit: 5 })))).toEqual([]);
    expect(issues(contactsPageSchema.safeParse(await mockTransport.get('/contacts')))).toEqual([]);
  });

  it('TIP-026: tag_id · sort · /contacts/board (cột theo giai đoạn, bỏ lọc stage) · /contacts/import-table', async () => {
    const stats = crmStatsSchema.parse(await mockTransport.get('/contacts/stats'));
    const vip = stats.tag_defs.find((d) => d.label === 'VIP')!;
    const tagged = contactsPageSchema.parse(await mockTransport.get('/contacts', { tag_id: vip.id }));
    expect(tagged.data.length).toBeGreaterThan(0);
    expect(tagged.data.every((c) => c.tags.includes('VIP'))).toBe(true);
    const byName = contactsPageSchema.parse(await mockTransport.get('/contacts', { sort: 'name' })).data.map((c) => c.full_name);
    expect(byName).toEqual([...byName].sort((a, b) => a.localeCompare(b, 'vi')));
    const board = contactsBoardSchema.parse(await mockTransport.get('/contacts/board', { stage: 'lead' }));
    expect(board.columns.map((c) => c.key)).toEqual(['lead', 'potential', 'consulting', 'quote', 'contract', 'won']);
    expect(board.columns.every((c) => c.rows.every((r) => r.stage === c.key) && c.total >= c.rows.length)).toBe(true);
    expect(importTableSchema.safeParse(await mockTransport.get('/contacts/import-table', { file_id: 'f' })).success).toBe(true);
  });

  it('GET /contacts/stats · /duplicates · /members · /contact-access-requests', async () => {
    expect(issues(crmStatsSchema.safeParse(await mockTransport.get('/contacts/stats')))).toEqual([]);
    expect(issues(duplicatesSchema.safeParse(await mockTransport.get('/contacts/duplicates')))).toEqual([]);
    expect(issues(membersListSchema.safeParse(await mockTransport.get('/members')))).toEqual([]);
    expect(issues(accessRequestsSchema.safeParse(await mockTransport.get('/contact-access-requests')))).toEqual([]);
  });

  it('GET /contacts/:id (360°) · /collaborators', async () => {
    const page = await mockTransport.get<{ data: { id: string }[] }>('/contacts', {});
    const id = page.data.find((c) => c.id.startsWith('kh_'))!.id;
    expect(issues(contact360Schema.safeParse(await mockTransport.get(`/contacts/${id}`)))).toEqual([]);
    expect(issues(collaboratorsSchema.safeParse(await mockTransport.get(`/contacts/${id}/collaborators`)))).toEqual([]);
  });

  it('GET /settings/fields · /settings/profile-layouts', async () => {
    expect(issues(fieldsDataSchema.safeParse(await mockTransport.get('/settings/fields', { entity: 'contact' })))).toEqual([]);
    expect(issues(profileLayoutsSchema.safeParse(await mockTransport.get('/settings/profile-layouts')))).toEqual([]);
  });

  it('TIP-015b: /contacts/:id/memory · contact.remember (trùng → refreshed) · memory_forget + hoàn tác · summarize (rule)', async () => {
    const mem = contactMemorySchema.parse(await mockTransport.get('/contacts/ct_lan/memory'));
    expect(mem.items.length).toBeGreaterThan(0);
    const a = await mockTransport.action<{ memory_id: string; status: string }>('contact.remember', { contact_id: 'ct_lan', fact: 'Thích trà gừng' });
    expect(a.status === 200 && a.data.result.status).toBe('created');
    const b = await mockTransport.action<{ memory_id: string; status: string }>('contact.remember', { contact_id: 'ct_lan', fact: 'thích trà gừng.' });
    expect(b.status === 200 && b.data.result.status).toBe('refreshed');
    const id = a.status === 200 ? a.data.result.memory_id : '';
    const f = await mockTransport.action('contact.memory_forget', { memory_id: id });
    expect(f.status).toBe(200);
    if (f.status === 200) await mockTransport.undo(f.data.action_log_id);
    expect(contactMemorySchema.parse(await mockTransport.get('/contacts/ct_lan/memory')).items.some((x) => x.memory_id === id)).toBe(true);
    const s = await mockTransport.action<{ source: string; bullets: string[] }>('contact.summarize', { contact_id: 'ct_lan' });
    expect(s.status === 200 && s.data.result.source).toBe('rule');
  });
});
