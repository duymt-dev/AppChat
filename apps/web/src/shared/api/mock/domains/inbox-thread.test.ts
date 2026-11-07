// TIP-025b P2 — mock tìm có trang + cửa sổ quanh tin đúng shape dùng chung (packages/shared/src/api/inbox-thread.ts).
import { beforeEach, describe, expect, it } from 'vitest';
import { threadAroundSchema, threadSearchPageSchema } from '@appchat/shared';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createInboxState } from './inbox';

describe('mock inbox thread window', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
  });

  it('search-page: shape đúng, total = số khớp, cursor nối trang', async () => {
    const msgs = mockDb().inbox.messages.c_lan!;
    for (let i = 0; i < 60; i++) msgs.push({ id: `m_x${i}`, kind: 'text', direction: 'in', body: `Hỏi giá triệt lông lần ${i}`, time: '09:00' });
    const p1 = threadSearchPageSchema.parse(await mockTransport.get('/conversations/c_lan/messages/search-page', { q: 'triet long' }));
    expect(p1.data).toHaveLength(50);
    expect(p1.total).toBeGreaterThanOrEqual(60);
    const p2 = threadSearchPageSchema.parse(await mockTransport.get('/conversations/c_lan/messages/search-page', { q: 'triet long', cursor: p1.next_cursor! }));
    expect(p1.data.length + p2.data.length).toBe(p1.total);
    const h = p1.data[0]!;
    expect(h.body.slice(h.ranges[0]![0], h.ranges[0]![1])).toBe('triệt lông');
  });

  it('around: cửa sổ chứa tin đích; tin không có → 404', async () => {
    const id = mockDb().inbox.messages.c_lan!.find((m) => m.direction)!.id;
    const w = threadAroundSchema.parse(await mockTransport.get(`/conversations/c_lan/messages/around/${id}`));
    expect(w.data.map((m) => m.id)).toContain(id);
    await expect(mockTransport.get('/conversations/c_lan/messages/around/khong_co')).rejects.toMatchObject({ status: 404 });
  });
});
