// TIP-015: route mock domain crm đúng shape đọc dùng chung với API thật (packages/shared/src/api/crm.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import {
  accessRequestsSchema,
  collaboratorsSchema,
  contact360Schema,
  contactsPageSchema,
  crmStatsSchema,
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
});
