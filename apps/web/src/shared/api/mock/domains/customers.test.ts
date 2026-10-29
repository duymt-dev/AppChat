import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createCustomersState } from './customers';

type List = { data: { id: string; owner_user_id: string; my_access: string; stage: string; tags: string[] }[] };

describe('mock customers', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().customers = createCustomersState();
  });

  it('Chủ sở hữu thấy toàn bộ 12 khách, lọc theo giai đoạn', async () => {
    expect((await mockTransport.get<List>('/contacts')).data).toHaveLength(12);
    const lead = await mockTransport.get<List>('/contacts', { stage: 'lead' });
    expect(lead.data.every((c) => c.stage === 'lead')).toBe(true);
  });

  it('Sales scope own: khách mình phụ trách + khách mình đồng phụ trách (D32)', async () => {
    setMockRole('sales');
    const rows = (await mockTransport.get<List>('/contacts')).data;
    expect(rows.every((c) => c.owner_user_id === 'u_tram' || c.my_access === 'collaborator')).toBe(true);
    expect(rows.some((c) => c.id === 'kh_1002' && c.my_access === 'collaborator')).toBe(true);
    expect(rows.some((c) => c.owner_user_id === 'u_huong')).toBe(false);
  });

  it('tạo khách trùng SĐT của người khác → CONTACT_OWNED, không lộ dữ liệu khách', async () => {
    await expect(mockTransport.action('contact.create', { full_name: 'Hiếu', phone: '0902 334 571' })).rejects.toMatchObject({
      error: { code: 'CONTACT_OWNED', fields: { owner_name: 'Minh' } },
    });
  });

  it('xin chia sẻ → duyệt → thành đồng phụ trách', async () => {
    const res = await mockTransport.action('contact.request_access', { contact_id: 'kh_1003' });
    const reqId = res.status === 200 ? (res.data.result as { request_id: string }).request_id : '';
    await mockTransport.action('contact.decide_access', { request_id: reqId, decision: 'approved' });
    setMockRole('sales');
    const rows = (await mockTransport.get<List>('/contacts')).data;
    expect(rows.find((c) => c.id === 'kh_1003')?.my_access).toBe('collaborator');
  });

  it('chuyển phụ trách chỉ với crm.reassign', async () => {
    setMockRole('sales');
    const input = { contact_id: 'ct_lan', to_user_id: 'u_minh', move: { conversations: true, quotes: true, appointments: false } };
    await expect(mockTransport.action('contact.transfer_owner', input)).rejects.toMatchObject({ error: { code: 'FORBIDDEN' } });
    setMockRole('manager');
    await mockTransport.action('contact.transfer_owner', input);
    expect(mockDb().customers.contacts.find((c) => c.id === 'ct_lan')?.owner_name).toBe('Minh');
  });

  it('xoá có hoàn tác; gắn tag', async () => {
    const res = await mockTransport.action('contact.delete', { contact_id: 'kh_1002' });
    expect((await mockTransport.get<List>('/contacts')).data).toHaveLength(11);
    if (res.status === 200) await mockTransport.undo(res.data.action_log_id);
    expect((await mockTransport.get<List>('/contacts')).data).toHaveLength(12);
    await mockTransport.action('contact.tag', { contact_id: 'kh_1002', tag: 'VIP', op: 'add' });
    expect((await mockTransport.get<List>('/contacts')).data.find((c) => c.id === 'kh_1002')?.tags).toContain('VIP');
  });
});
