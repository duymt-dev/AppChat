// D56: create / update nhận `custom`, validate theo định nghĩa ở Cài đặt › Trường dữ liệu; danh sách lọc `cf.<key>`.
import { beforeEach, describe, expect, it } from 'vitest';
import { mockTransport } from '../mock-transport';
import { mockDb, setMockRole } from '../store';
import { createCustomersState } from './customers';
import { createSettingsDataState } from './settings-data';
import { seedCustomValues } from './custom-values';

type Rows = { data: { id: string; custom?: Record<string, unknown> }[]; meta: { total: number } };

describe('mock custom values (D56)', () => {
  beforeEach(() => {
    setMockRole('owner');
    mockDb().settingsData = createSettingsDataState();
    mockDb().customers = createCustomersState();
    seedCustomValues(mockDb());
  });

  it('tạo khách kèm trường tuỳ biến → lưu vào bản ghi, đọc lại qua danh sách', async () => {
    const res = await mockTransport.action('contact.create', {
      full_name: 'Chị Hoa',
      phone: '0900000001',
      custom: { tier: 'Gold', birthday: '1995-05-20' },
    });
    const id = res.status === 200 ? (res.data.result as { contact_id: string }).contact_id : '';
    expect(mockDb().customers.contacts.find((c) => c.id === id)).toMatchObject({
      custom: { tier: 'Gold', birthday: '1995-05-20' },
    });
  });

  it('sai lựa chọn / sai kiểu / trường hệ thống → 422 với fields custom.<key>', async () => {
    await expect(
      mockTransport.action('contact.create', {
        full_name: 'X',
        phone: '0900000002',
        custom: { tier: 'Platinum', ltv: '1,5tr', phone: '1' },
      }),
    ).rejects.toMatchObject({
      error: {
        code: 'VALIDATION_FAILED',
        fields: { 'custom.tier': 'option', 'custom.ltv': 'money', 'custom.phone': 'unknown' },
      },
    });
  });

  it('trường giới hạn vai trò: Sales không ghi được LTV', async () => {
    setMockRole('sales');
    await expect(
      mockTransport.action('contact.update', { contact_id: 'kh_1002', patch: { custom: { ltv: '1000' } } }),
    ).rejects.toMatchObject({
      error: { fields: { 'custom.ltv': 'forbidden' } },
    });
  });

  it('update merge từng key, null xoá giá trị', async () => {
    await mockTransport.action('contact.update', {
      contact_id: 'kh_1002',
      patch: { custom: { tier: 'VIP', ltv: null } },
    });
    expect(mockDb().customers.contacts.find((c) => c.id === 'kh_1002')).toMatchObject({
      custom: { kind: 'Doanh nghiệp', tier: 'VIP', tax_code: '0312345678' },
    });
    expect(
      (mockDb().customers.contacts.find((c) => c.id === 'kh_1002') as unknown as { custom: object }).custom,
    ).not.toHaveProperty('ltv');
  });

  it('trường bắt buộc khi tạo: sản phẩm thiếu → required', async () => {
    await mockTransport.action('custom_field.define', {
      entity: 'product',
      label: 'Hoạt chất',
      type: 'text',
      required: true,
    });
    const key = mockDb().settingsData.fields.product!.at(-1)!.key;
    await expect(
      mockTransport.action('product.create', { name: 'Serum', type: 'physical', price: '100000' }),
    ).rejects.toMatchObject({
      error: { fields: { [`custom.${key}`]: 'required' } },
    });
  });

  it('lọc danh sách theo cf.<key> trước khi phân trang (tổng đúng)', async () => {
    const vip = await mockTransport.get<Rows>('/contacts', { 'cf.tier': 'VIP', page: 1, limit: 20 });
    expect(vip.data.map((r) => r.id).sort()).toEqual(['ct_lan', 'kh_1005']);
    expect(vip.meta.total).toBe(2);
    const biz = await mockTransport.get<Rows>('/contacts', { 'cf.kind': 'Doanh nghiệp', 'cf.tier': 'VIP' });
    expect(biz.data.map((r) => r.id)).toEqual(['kh_1005']);
  });
});
