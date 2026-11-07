// TIP-038 pha 3: mock xuất 4 danh sách đúng shape dùng chung với API thật (listExportResultSchema / dataJobSchema) + luật như server —
// tập dòng = toàn bộ dòng khớp bộ lọc (không chỉ trang); ≤ 50 dòng có link tải ngay; tệp tải được, ô bắt đầu "=" bị chặn công thức.
// `exportInput` bỏ giá trị rỗng / `all` của bộ lọc màn.
import { describe, expect, it } from 'vitest';
import { dataJobSchema, listExportResultSchema } from '@appchat/shared';
import { exportInput } from '@/shared/actions/useListExport';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

const result = (r: { data: unknown }) => listExportResultSchema.parse((r.data as { result: unknown }).result);

describe('mock xuất danh sách', () => {
  it('4 danh sách: số dòng = số dòng danh sách không phân trang theo cùng bộ lọc; link tải ngay (≤ 50)', async () => {
    for (const [kind, path, f] of [
      ['quote.export', '/quotes', { status: 'sent' }],
      ['order.export', '/orders', {}],
      ['contract.export', '/contracts', {}],
      ['ticket.export', '/tickets', { priority: 'high' }],
    ] as const) {
      const all = (await mockTransport.get<{ meta: { total: number } }>(path, f)).meta.total;
      const r = result(await mockTransport.action(kind, f));
      expect(r.rows, kind).toBe(all);
      expect(r.download_url).toBe(`/v1/data-jobs/${r.job_id}/download`);
      expect(r.file_name).toMatch(/\.xlsx$/);
      expect(dataJobSchema.parse(await mockTransport.get(`/data-jobs/${r.job_id}`)).status).toBe('completed');
      expect((await mockTransport.blob(`/data-jobs/${r.job_id}/download`)).size).toBeGreaterThan(0);
    }
  });

  it('ô bắt đầu "=" bị chặn công thức trong tệp', async () => {
    const t = mockDb().tickets.tickets[0]!;
    t.title = '=HYPERLINK("x")';
    const r = result(await mockTransport.action('ticket.export', { q: t.code }));
    const text = await (await mockTransport.blob(`/data-jobs/${r.job_id}/download`)).text();
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it('exportInput: bỏ rỗng / all, giữ trường tuỳ biến có giá trị', () => {
    expect(exportInput({ status: 'all', owner_id: 'u1', q: '', custom: { size: 'M', empty: '' } })).toEqual({
      owner_id: 'u1',
      custom: { size: 'M' },
    });
    expect(exportInput({ chip: 'all', value: 'all' })).toEqual({});
  });
});
