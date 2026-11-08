// TIP-026b §5 — nhập 3 tập hoạt động CRM qua 038b: registry tập theo thực thể (không tập tuỳ ý), danh tính tập bất biến của kế hoạch
// (khác tập → 409, lược đồ đổi → 409 lập lại), đoán ánh xạ tiêu đề tiếng Việt, luật dòng chặn trước xác nhận (việc nhập luôn mở, cơ hội
// won / lost bị từ chối, giá trị kỳ vọng cần quyền ghi tiền, dòng có id xuất từ hệ thống bị loại), tra khách đúng một / nhiều / không thấy,
// mỗi dòng một lệnh action canonical (ghi chú / bình luận theo `kind` cố định của dòng), CSV mẫu thật đọc được.
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { AppError, DATASETS_OF, guessTransferMapping, transferSpec, type AuthzContext } from '@appchat/shared';
import { assertDataset, datasetIdentity, planTarget, resolveTarget } from '../src/data-transfer/services/dataset';
import { checkRow, resolveMapping } from '../src/data-transfer/services/validation';
import { parseTransferFile } from '../src/data-transfer/services/file-parser';
import { adapterFor } from '../src/data-transfer/adapters';
import { canImport } from '../src/data-transfer/services/plan-view';

vi.mock('../src/crm/public', async (orig) => ({
  ...(await orig<typeof import('../src/crm/public')>()),
  // Khách ghi được: chỉ id bắt đầu bằng "w" (mô phỏng scope ghi của người nhập).
  editableContact: vi.fn(async (_tx: unknown, _a: unknown, id: string) => {
    if (!id.startsWith('w')) throw new AppError('NOT_FOUND', 404);
    return { id };
  }),
}));

const authz = (perms: string[]): AuthzContext =>
  ({ userId: 'u1', isOwner: false, permissions: new Set(perms), scope: { crm: 'own' }, teamIds: [] }) as unknown as AuthzContext;
const code = (e: () => unknown) => {
  try {
    e();
  } catch (x) {
    return { status: (x as AppError).httpStatus, fields: (x as AppError).fields };
  }
  return null;
};

/** tx giả: khách theo mã / SĐT / email. */
const CONTACTS = [
  { id: 'w1', code: 'KH001', phoneNorm: '0909000001', email: 'an@vd.vn' },
  { id: 'w2', code: 'KH002', phoneNorm: '0909000002', email: 'chung@vd.vn' },
  { id: 'w3', code: 'KH003', phoneNorm: '0909000002', email: null },
  { id: 'r9', code: 'KH009', phoneNorm: '0909000009', email: null },
];
const tx = {
  contact: {
    findMany: async ({ where }: { where: { code?: string; OR?: { phoneNorm?: string; email?: string }[] } }) =>
      CONTACTS.filter((c) =>
        where.code ? c.code === where.code : (where.OR ?? []).some((o) => (o.phoneNorm && o.phoneNorm === c.phoneNorm) || (o.email && o.email === c.email)),
      ).map((c) => ({ id: c.id })),
  },
} as never;

const rows = (target: Parameters<typeof transferSpec>[0], cols: string[], data: string[][]) => {
  const map = resolveMapping(target, cols, guessTransferMapping(target, cols));
  return data.map((r, i) => checkRow(target, map, r, i + 1));
};

describe('tập dữ liệu — registry + danh tính bất biến', () => {
  it('chỉ khách có 3 tập hoạt động; tập lạ / sai thực thể → 422', () => {
    expect(DATASETS_OF.contact).toEqual(['base', 'contact_notes', 'contact_tasks', 'contact_opportunities']);
    expect(resolveTarget('contact', undefined)).toBe('contact');
    expect(resolveTarget('contact', 'contact_tasks')).toBe('contact_tasks');
    expect(code(() => resolveTarget('quote', 'contact_notes'))).toEqual({ status: 422, fields: { dataset: 'unsupported' } });
  });

  it('kế hoạch cũ 038b = base phiên bản 1; lược đồ đổi → 409 lập lại; gửi kèm tập khác → 409', () => {
    expect(planTarget({ entity: 'order', dataset: 'base', datasetSchemaVersion: 1 })).toBe('order');
    expect(datasetIdentity('contact_opportunities')).toEqual({ dataset: 'contact_opportunities', datasetSchemaVersion: 1 });
    expect(code(() => planTarget({ entity: 'contact', dataset: 'contact_tasks', datasetSchemaVersion: 99 }))?.status).toBe(409);
    expect(code(() => assertDataset({ dataset: 'contact_tasks' }, 'contact_notes'))).toEqual({ status: 409, fields: { dataset: 'mismatch' } });
    expect(code(() => assertDataset({ dataset: 'contact_tasks' }, undefined))).toBeNull();
  });

  it('quyền nhập tập hoạt động = crm.import ∩ crm.edit (không cấp quyền mới)', () => {
    expect(canImport(authz(['crm.import']), 'contact_notes')).toBe(false);
    expect(canImport(authz(['crm.import', 'crm.edit']), 'contact_notes')).toBe(true);
    expect(canImport(authz(['crm.import']), 'contact')).toBe(true);
    expect(transferSpec('contact_tasks').writeAction).toBe('contact_task.create');
  });
});

describe('ánh xạ + luật dòng', () => {
  it('đoán ánh xạ tiêu đề tiếng Việt cho 3 tập', () => {
    expect(guessTransferMapping('contact_notes', ['Mã khách', 'Loại', 'Nội dung'])).toEqual({ contact_code: 'Mã khách', kind: 'Loại', body: 'Nội dung' });
    expect(guessTransferMapping('contact_tasks', ['SĐT', 'Công việc', 'Hạn chót'])).toEqual({ contact_phone: 'SĐT', title: 'Công việc', due: 'Hạn chót' });
    expect(guessTransferMapping('contact_opportunities', ['Email', 'Cơ hội', 'Giá trị kỳ vọng', 'Xác suất'])).toMatchObject({
      contact_email: 'Email',
      title: 'Cơ hội',
      expected_amount: 'Giá trị kỳ vọng',
      probability: 'Xác suất',
    });
  });

  it('việc: trạng thái khác open → readonly; khách ambiguous / not_found; dòng hợp lệ có contact_id', async () => {
    const r = rows('contact_tasks', ['Mã khách', 'SĐT', 'Công việc', 'Trạng thái'], [
      ['KH001', '', 'Gọi lại', 'Mở'],
      ['', '0909000002', 'Gửi báo giá', ''],
      ['KH009', '', 'Ngoài scope', ''],
      ['KH001', '', 'Đã xong rồi', 'Hoàn thành'],
    ]);
    const kinds = await adapterFor('contact_tasks').classify(tx, { userId: 'u1', authz: authz(['crm.import', 'crm.edit']) }, r);
    expect(kinds).toEqual(['valid', 'valid', 'valid', 'valid']);
    expect(r[0]!.data.contact_id).toBe('w1');
    expect(r[1]!.errors.contact).toBe('ambiguous');
    expect(r[2]!.errors.contact).toBe('not_found');
    expect(r[3]!.errors.state).toBe('readonly');
  });

  it('cơ hội: won → terminal; có giá trị kỳ vọng mà không quyền ghi tiền → forbidden; xác suất > 100 → invalid', async () => {
    const r = rows('contact_opportunities', ['Mã khách', 'Cơ hội', 'Giá trị kỳ vọng', 'Giai đoạn', 'Xác suất'], [
      ['KH001', 'Gói A', '15.000.000', 'Đề xuất', '60'],
      ['KH001', 'Gói B', '', 'Thắng', ''],
      ['KH001', 'Gói C', '', '', '120'],
    ]);
    await adapterFor('contact_opportunities').classify(tx, { userId: 'u1', authz: authz(['crm.import', 'crm.edit']) }, r);
    expect(r[0]!.errors).toEqual({ expected_amount: 'forbidden' });
    expect(r[1]!.errors.stage).toBe('terminal');
    expect(r[2]!.errors.probability).toBe('invalid');
    const ok = rows('contact_opportunities', ['Mã khách', 'Cơ hội', 'Giá trị kỳ vọng'], [['KH001', 'Gói A', '15.000.000']]);
    await adapterFor('contact_opportunities').classify(tx, { userId: 'u1', authz: authz(['crm.import', 'crm.edit', 'quote.create']) }, ok);
    expect(ok[0]!.errors).toEqual({});
    expect(ok[0]!.data.expected_amount).toBe('15000000');
  });

  it('ghi chú: kind mặc định note; dòng có id xuất → duplicate (cảnh báo exported_record, không cập nhật)', async () => {
    const r = rows('contact_notes', ['Mã khách', 'Loại', 'Nội dung', 'ID'], [
      ['KH001', '', 'Khách hỏi giá', ''],
      ['KH001', 'Bình luận', 'Nội bộ: gọi lại', ''],
      ['KH001', '', 'Bản xuất', '0190f000-0000-7000-8000-000000000001'],
    ]);
    const kinds = await adapterFor('contact_notes').classify(tx, { userId: 'u1', authz: authz(['crm.import', 'crm.edit']) }, r);
    expect(kinds).toEqual(['valid', 'valid', 'duplicate']);
    expect(r[0]!.data.kind).toBe('note');
    expect(r[1]!.data.kind).toBe('comment');
    expect(r[2]!.errors.id_warning).toBe('exported_record');
  });
});

describe('đơn vị ghi — mỗi dòng một action canonical', () => {
  const pending = (data: Record<string, string>) => ({ id: 'r1', rowNo: 3, groupKey: null, data });

  it('ghi chú / bình luận chọn action theo kind; không nguồn hội thoại', () => {
    const a = adapterFor('contact_notes');
    expect(a.units!([pending({ contact_id: 'w1', kind: 'comment', body: 'x' })], { userId: 'u1' })[0]).toMatchObject({
      action: 'contact.add_comment',
      key: '3',
      input: { contact_id: 'w1', body: 'x' },
    });
    expect(a.units!([pending({ contact_id: 'w1', kind: 'note', body: 'y' })], { userId: 'u1' })[0]!.action).toBe('contact.add_note');
  });

  it('việc: hạn = 23:59 giờ VN, không assignee (người nhập tự nhận); cơ hội: amount_vnd chuỗi, probability số', () => {
    const t = adapterFor('contact_tasks').units!([pending({ contact_id: 'w1', title: 'Gọi', due: '2026-11-20' })], { userId: 'u1' })[0]!;
    expect(t.input).toEqual({ contact_id: 'w1', title: 'Gọi', due_at: '2026-11-20T23:59:00+07:00' });
    const o = adapterFor('contact_opportunities').units!(
      [pending({ contact_id: 'w1', title: 'Gói', expected_amount: '15000000', probability: '60', stage: 'proposal' })],
      { userId: 'u1' },
    )[0]!;
    expect(o.input).toEqual({ contact_id: 'w1', title: 'Gói', amount_vnd: '15000000', probability: 60, stage: 'proposal' });
  });

  it('ghép kết quả theo id action trả về', async () => {
    const a = adapterFor('contact_tasks');
    const unit = a.units!([pending({ contact_id: 'w1', title: 'Gọi' })], { userId: 'u1' })[0]!;
    expect((await a.resolve!({} as never, unit, { task_id: 't9', version: 1 })).get('r1')).toEqual({ id: 't9', code: null });
  });
});

describe('tệp mẫu thật', () => {
  it('fixtures/data-transfer/crm-activities.csv đọc được, giữ số 0 đầu SĐT', async () => {
    const body = readFileSync(new URL('../../../fixtures/data-transfer/crm-activities.csv', import.meta.url));
    const t = await parseTransferFile({ name: 'crm-activities.csv', mime: 'text/csv', body });
    expect(t.columns.slice(0, 4)).toEqual(['Mã khách', 'SĐT', 'Loại', 'Nội dung']);
    expect(t.rows[0]![1]).toMatch(/^0\d{9}$/);
    const r = rows('contact_notes', t.columns, t.rows);
    expect(r.every((x) => !Object.keys(x.errors).length)).toBe(true);
  });
});
