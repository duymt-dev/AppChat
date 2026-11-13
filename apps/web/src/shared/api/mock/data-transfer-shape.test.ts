// TIP-038b P4: mock nhập dữ liệu dùng chung đúng shape server (packages/shared/src/api/data-transfer.ts) — plan đoán ánh xạ, kiểm dòng
// (bắt buộc / SĐT / trùng trong tệp), sửa ánh xạ → version mới (version cũ 409), commit bulk luôn xem trước rồi ghi khách qua đúng
// handler contact.import của mock; `all_valid` còn dòng lỗi → 409.
import { describe, expect, it } from 'vitest';
import { transferPlanSchema, transferRowsPageSchema, transferSampleSchema, type TransferPlanDto } from '@appchat/shared';
import { mockTransport } from './mock-transport';
import { mockDb } from './store';

const TAG = String(Date.now()).slice(-6);
const csv = (rows: string[]) => new File([['Tên khách,Điện thoại,Ghi chú', ...rows].join('\n')], `k-${TAG}.csv`, { type: 'text/csv' });
type Done<T> = { result: T };

async function commit(plan: TransferPlanDto) {
  const p = await mockTransport.action('transfer.commit', { plan_id: plan.id, if_version: plan.version });
  expect(p.data).toMatchObject({ status: 'preview_required' });
  return mockTransport.action('transfer.commit', { plan_id: plan.id, if_version: plan.version }, { confirmToken: (p.data as { confirm_token: string }).confirm_token });
}

describe('mock nhập dữ liệu dùng chung', () => {
  it('sample → plan → sửa ánh xạ → commit (xem trước) → khách tạo qua contact.import', async () => {
    const up = await mockTransport.upload(csv([`An ${TAG},0987${TAG},`, `Bình ${TAG},abc,`, `Chi ${TAG},0987${TAG},trùng`]), 'import');
    const sample = transferSampleSchema.parse(((await mockTransport.action('transfer.sample', { entity: 'contact', file_id: up.file_id })).data as Done<unknown>).result);
    expect(sample.mapping).toMatchObject({ full_name: 'Tên khách', phone: 'Điện thoại' });

    const r = await mockTransport.action('transfer.plan', { entity: 'contact', file_id: up.file_id, mapping: { full_name: 'Tên khách' } });
    const plan = transferPlanSchema.parse((r.data as Done<unknown>).result);
    expect(plan.counts).toMatchObject({ total: 3, valid: 0, invalid: 3 });

    const v2 = transferPlanSchema.parse(
      ((await mockTransport.action('transfer.update_mapping', { plan_id: plan.id, if_version: 1, mapping: { full_name: 'Tên khách', phone: 'Điện thoại' } })).data as Done<unknown>).result,
    );
    expect(v2).toMatchObject({ version: 2, counts: { valid: 1, invalid: 1, duplicates: 1 } });
    await expect(mockTransport.action('transfer.update_mapping', { plan_id: plan.id, if_version: 1, row_policy: 'only_valid' })).rejects.toMatchObject({ error: { code: 'CONFLICT' } });

    const bad = transferRowsPageSchema.parse(await mockTransport.get(`/data-transfer/plans/${plan.id}/rows`, { check: 'invalid' }));
    expect(bad.data).toEqual([expect.objectContaining({ row_no: 2, errors: { phone: 'invalid' } })]);
    await expect(commit(v2)).rejects.toMatchObject({ error: { code: 'INVALID_STATE' } });

    const v3 = transferPlanSchema.parse(((await mockTransport.action('transfer.update_mapping', { plan_id: plan.id, if_version: 2, row_policy: 'only_valid' })).data as Done<unknown>).result);
    const done = await commit(v3);
    expect((done.data as Done<unknown>).result).toMatchObject({ status: 'completed', applied: 1 });
    expect(mockDb().customers.contacts.filter((c) => c.full_name === `An ${TAG}`)).toHaveLength(1);
    const after = transferPlanSchema.parse(await mockTransport.get(`/data-transfer/plans/${plan.id}`));
    expect(after).toMatchObject({ status: 'completed', counts: { applied: 1 } });
  });

  it('năng lực đủ 6 thực thể + 3 tập hoạt động khách (TIP-026b) + liệu trình chỉ xuất (TIP-033b) + danh mục ticket (TIP-034b) + kết quả sửa ticket hàng loạt chỉ xuất (TIP-034c); kế hoạch không có → 404', async () => {
    const caps = (await mockTransport.get('/data-transfer/capabilities')) as { entity: string; dataset: string; import: { supported: boolean }; export: { action_id: string } }[];
    expect(caps).toHaveLength(12);
    expect(caps.find((c) => c.entity === 'ticket_bulk_results')).toMatchObject({ dataset: 'base', import: { supported: false }, export: { action_id: 'ticket.bulk_export' } });
    expect(caps.find((c) => c.entity === 'ticket_category_suggestions')).toMatchObject({ dataset: 'base', export: { action_id: 'ticket_categories.export' } });
    expect(caps.filter((c) => c.entity === 'contact').map((c) => c.dataset)).toEqual(['base', 'contact_notes', 'contact_tasks', 'contact_opportunities', 'customer_packages']);
    expect(caps.find((c) => c.dataset === 'customer_packages')).toMatchObject({ import: { supported: false }, export: { action_id: 'package.export' } });
    await expect(mockTransport.get('/data-transfer/plans/khong-co')).rejects.toMatchObject({ error: { code: 'NOT_FOUND' } });
  });

  it('tập hoạt động: tập cố định của kế hoạch, gửi kèm tập khác → 409; tập sai thực thể → 422 (TIP-026b §5)', async () => {
    const f = new File([['Mã khách,Công việc,Trạng thái', 'KH001,Gọi lại,Mở', 'KH001,Đã xong,Hoàn thành'].join('\n')], `v-${TAG}.csv`, { type: 'text/csv' });
    const up = await mockTransport.upload(f, 'import');
    const r = await mockTransport.action('transfer.plan', { entity: 'contact', dataset: 'contact_tasks', file_id: up.file_id });
    const plan = transferPlanSchema.parse((r.data as Done<unknown>).result);
    expect(plan).toMatchObject({ dataset: 'contact_tasks', dataset_schema_version: 1, counts: { valid: 1, invalid: 1 } });
    await expect(mockTransport.action('transfer.commit', { plan_id: plan.id, if_version: plan.version, dataset: 'contact_notes' })).rejects.toMatchObject({ error: { code: 'CONFLICT' } });
    await expect(mockTransport.action('transfer.plan', { entity: 'quote', dataset: 'contact_notes', file_id: up.file_id })).rejects.toMatchObject({ error: { fields: { dataset: 'unsupported' } } });
    // Liệu trình chỉ xuất (TIP-033b §5.1): nhập số buổi bị từ chối trước khi đọc tệp.
    await expect(mockTransport.action('transfer.plan', { entity: 'contact', dataset: 'customer_packages', file_id: up.file_id })).rejects.toMatchObject({ error: { fields: { dataset: 'export_only' } } });
  });
});
