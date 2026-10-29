import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createCustomersState } from './customers';
import { createSettingsDataState } from './settings-data';

type Tags = { data: { id: string; name: string }[] };
type Fields = { data: { key: string; label: string; sys: boolean }[]; counts: Record<string, number> };

describe('mock settings-data', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().settingsData = createSettingsDataState();
    mockDb().customers = createCustomersState();
  });

  it('thẻ: tìm không dấu, tạo trùng tên → CONFLICT, xoá rồi hoàn tác về đúng vị trí', async () => {
    expect((await mockTransport.get<Tags>('/settings/tags', { q: 'khach moi' })).data).toHaveLength(1);
    await expect(mockTransport.action('tag.create', { name: 'vip' })).rejects.toMatchObject({ error: { code: 'CONFLICT' } });
    const res = await mockTransport.action('tag.delete', { tag_id: 'tg_new' });
    expect((await mockTransport.get<Tags>('/settings/tags')).data).toHaveLength(7);
    await mockTransport.undo(res.status === 200 ? res.data.action_log_id : '');
    expect((await mockTransport.get<Tags>('/settings/tags')).data[1]?.id).toBe('tg_new');
  });

  it('trường: thêm trường liên hệ đồng bộ sang CRM; trường hệ thống không xoá được; đổi thứ tự', async () => {
    const before = mockDb().customers.fields.length;
    await mockTransport.action('custom_field.define', { entity: 'contact', label: 'Nghề nghiệp', type: 'text' });
    expect(mockDb().customers.fields).toHaveLength(before + 1);
    const f = await mockTransport.get<Fields>('/settings/fields', { entity: 'contact' });
    expect(f.counts.contact).toBe(10);
    await expect(mockTransport.action('custom_field.delete', { entity: 'contact', key: 'phone' })).rejects.toMatchObject({ error: { code: 'VALIDATION_FAILED' } });
    const order = f.data.map((x) => x.key);
    [order[0], order[1]] = [order[1]!, order[0]!];
    await mockTransport.action('custom_field.update', { entity: 'contact', order });
    expect((await mockTransport.get<Fields>('/settings/fields', { entity: 'contact' })).data[0]?.key).toBe('phone');
  });

  it('Kế toán không có inbox.manage → không tạo được câu trả lời mẫu', async () => {
    setMockRole('accountant');
    await expect(mockTransport.action('canned_reply.create', { shortcut: '/x', title: 'X', body: 'x', category: 'Khác' })).rejects.toMatchObject({
      error: { code: 'FORBIDDEN' },
    });
  });
});
