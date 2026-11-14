// TIP-045b annex D: mock việc dữ liệu nặng đúng shape dùng chung với API thật (packages/shared/src/api/data-jobs.ts) + luật như server —
// contact.bulk_update luôn xem trước; ≤ 50 kết quả từng khách (id không có → lỗi riêng); > 50 → 202 job_accepted rồi theo dõi tới xong;
// thử lại chỉ bản ghi lỗi; huỷ việc đã xong → 409 INVALID_STATE.
import { describe, expect, it } from 'vitest';
import { dataJobItemsSchema, dataJobSchema } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

async function bulk(input: unknown) {
  const p = await mockTransport.action('contact.bulk_update', input);
  expect(p.data).toMatchObject({ status: 'preview_required' });
  return mockTransport.action('contact.bulk_update', input, { confirmToken: (p.data as { confirm_token: string }).confirm_token });
}

describe('mock sửa hàng loạt khách', () => {
  it('≤ 50: kết quả từng khách, id lạ lỗi riêng; patch áp đúng', async () => {
    const [a] = mockDb().customers.contacts;
    const r = await bulk({ contact_ids: [a!.id, 'ct_khong_co'], patch: { group: 'vip', add_tags: ['Đợt mock'] } });
    expect(r.status).toBe(200);
    expect((r.data as { result: unknown }).result).toMatchObject({ updated: 1, failed: 1, items: [{ id: a!.id, status: 'done' }, { id: 'ct_khong_co', status: 'failed' }] });
    expect(mockDb().customers.contacts[0]!.tags).toContain('Đợt mock');
  });

  it('> 50: 202 job_accepted → running → completed (đúng schema); thử lại chỉ bản ghi lỗi; huỷ việc đã xong 409', async () => {
    const ids = [...mockDb().customers.contacts.slice(0, 5).map((c) => c.id), ...Array.from({ length: 50 }, (_, i) => `ct_x${i}`)];
    const r = await bulk({ contact_ids: ids, patch: { city: 'Huế' } });
    expect(r.status).toBe(202);
    const acc = r.data as { status: string; job_id: string; status_url: string };
    expect(acc).toMatchObject({ status: 'job_accepted', status_url: `/v1/data-jobs/${acc.job_id}` });
    expect(dataJobSchema.parse(await mockTransport.get(`/data-jobs/${acc.job_id}`)).status).toBe('running');
    const st = dataJobSchema.parse(await mockTransport.get(`/data-jobs/${acc.job_id}`));
    expect(st).toMatchObject({ status: 'completed', total: 55, done: 5, failed: 50 });
    const failed = dataJobItemsSchema.parse(await mockTransport.get(`/data-jobs/${acc.job_id}/items`, { only: 'failed' }));
    expect(failed.data).toHaveLength(50);
    // Việc đã xong → huỷ 409; thử lại → 202 (cùng handle), lại xong; huỷ lần đã huỷ lặp lại an toàn.
    await expect(mockTransport.action('data_job.cancel', { job_id: acc.job_id })).rejects.toMatchObject({ error: { code: 'INVALID_STATE' } });
    const rt = await mockTransport.action('data_job.retry', { job_id: acc.job_id });
    expect(rt).toMatchObject({ status: 202, data: { job_id: acc.job_id } });
    await expect(mockTransport.action('data_job.cancel', { job_id: acc.job_id })).resolves.toMatchObject({ status: 200 });
    expect(dataJobSchema.parse(await mockTransport.get(`/data-jobs/${acc.job_id}`)).status).toBe('cancelled');
    await expect(mockTransport.action('data_job.cancel', { job_id: acc.job_id })).resolves.toMatchObject({ data: { result: { status: 'cancelled' } } });
  });
});
