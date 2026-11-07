// TIP-025b P1 — mock thao tác hàng loạt Hộp thư cùng luật server: bulk luôn xem trước kèm số; ≤ 50 kết quả từng id (id không có → lỗi
// riêng), > 50 → 202 job_accepted; alias "bỏ" không bao giờ bật lại; đếm thư mục áp cùng bộ lọc kênh với danh sách.
import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createInboxState } from './inbox';

type Res = { status: number; data: { status?: string; preview?: { count: number }; confirm_token?: string; result?: { updated: number; failed: number; items: { id: string; status: string; error: string | null }[] }; job_id?: string } };
const bulk = async (input: unknown) => {
  const p = (await mockTransport.action('conversation.bulk_update', input)) as Res;
  expect(p.data.status).toBe('preview_required');
  return { preview: p.data.preview!, done: (await mockTransport.action('conversation.bulk_update', input, { confirmToken: p.data.confirm_token })) as Res };
};
const all = (c: { tabs: [string, number][] }) => c.tabs.find((t) => t[0] === 'all')![1];

describe('mock inbox bulk', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().inbox = createInboxState();
  });

  it('≤ 50: kết quả từng id, trùng bỏ, id không có → NOT_FOUND riêng; lặp lại → skipped', async () => {
    const { preview, done } = await bulk({ conversation_ids: ['c_lan', 'c_hieu', 'c_lan', 'c_khong'], status: 'closed' });
    expect(preview.count).toBe(3);
    expect(done.data.result).toEqual({
      updated: 2,
      failed: 1,
      items: [
        { id: 'c_lan', status: 'done', error: null },
        { id: 'c_hieu', status: 'done', error: null },
        { id: 'c_khong', status: 'failed', error: 'NOT_FOUND:conversation_id' },
      ],
    });
    const again = await bulk({ conversation_ids: ['c_lan'], status: 'closed' });
    expect(again.done.data.result!.items[0]!.status).toBe('skipped');
  });

  it('> 50 → 202 job_accepted', async () => {
    const ids = Array.from({ length: 51 }, (_, i) => `c_x${i}`);
    const { done } = await bulk({ conversation_ids: ids, archive: true });
    expect(done.status).toBe(202);
    expect(done.data).toMatchObject({ status: 'job_accepted' });
    expect(done.data.job_id).toBeTruthy();
  });

  it('alias bỏ: untag / unhide không bật lại', async () => {
    const c = mockDb().inbox.conversations.find((x) => x.id === 'c_lan')!;
    const label = c.tags[0]?.label ?? 'VIP';
    const r1 = (await mockTransport.action('conversation.untag', { conversation_id: 'c_lan', tag: label.toUpperCase() })) as { data: { result: { tags: string[] } } };
    expect(r1.data.result.tags).not.toContain(label);
    await mockTransport.action('conversation.unhide', { conversation_id: 'c_lan' });
    await mockTransport.action('conversation.unhide', { conversation_id: 'c_lan' });
    expect(mockDb().inbox.conversations.find((x) => x.id === 'c_lan')!.hidden).toBeFalsy();
  });

  it('đếm thư mục theo kênh khớp danh sách lọc', async () => {
    const counts = await mockTransport.get<{ tabs: [string, number][] }>('/conversations/counts', { channel: 'email' });
    const list = await mockTransport.get<{ data: unknown[] }>('/conversations', { channel: 'email' });
    expect(all(counts)).toBe(list.data.length);
  });
});
