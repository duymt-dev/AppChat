// TIP-027 AC2: bản nháp form → input product.create / update theo loại (chỉ gửi trường của loại); sửa điền lại thành phần /
// thuộc tính / thông số từ chi tiết GET /products/:id.
import { describe, expect, it } from 'vitest';
import { initialDraft, toInput, variantsOf } from './useProductForm';
import type { Product } from '../types';

const base = initialDraft(['Liệu trình', 'Sản phẩm']);
const d = (p: Partial<typeof base>) => ({ ...base, name: ' Tên ', price: '500000', ...p });

describe('toInput theo loại', () => {
  it('vật lý: sku + tồn + giá vốn + thuộc tính', () => {
    const i = toInput(
      d({
        type: 'physical',
        sku: 'SKU1',
        stock: '10',
        cost: '300000',
        attrs: [{ name: 'Màu', value: 'Đỏ / Đen' }],
      }),
    );
    expect(i).toMatchObject({
      name: 'Tên',
      type: 'physical',
      sku: 'SKU1',
      stock: 10,
      cost: '300000',
      attrs: [{ name: 'Màu', values: ['Đỏ', 'Đen'] }],
    });
  });
  it('dịch vụ: thời lượng, không tồn / sku', () => {
    const i = toInput(d({ type: 'service', duration: '60', stock: '5', sku: 'x' }));
    expect(i).toMatchObject({ type: 'service', duration_min: 60 });
    expect(i).not.toHaveProperty('stock');
    expect(i).not.toHaveProperty('sku');
  });
  it('combo: thành phần theo tên + số lượng; gói: buổi + hạn (tháng → ngày); thuê: đơn vị + cọc', () => {
    expect(
      toInput(
        d({
          type: 'combo',
          combo: [
            { name: 'Serum', value: '2' },
            { name: ' ', value: '1' },
          ],
        }),
      ).components,
    ).toEqual([{ name: 'Serum', qty: 2 }]);
    expect(toInput(d({ type: 'package', sessions: '8', validMonths: '2' }))).toMatchObject({
      sessions: 8,
      valid_days: 60,
    });
    expect(toInput(d({ type: 'rental', rentUnit: 'week', deposit: '1000000' }))).toMatchObject({
      rental_unit: 'week',
      deposit: '1000000',
    });
  });
  it('biến thể ≤ 24 tổ hợp', () => {
    expect(
      variantsOf([
        { name: 'A', value: '1/2/3/4/5' },
        { name: 'B', value: '1/2/3/4/5/6' },
      ]),
    ).toHaveLength(24);
  });
});

describe('initialDraft khi sửa', () => {
  it('điền thành phần, thuộc tính, thời lượng, cọc từ chi tiết', () => {
    const p = {
      id: 'p',
      code: 'SP-1',
      name: 'X',
      category: 'Sản phẩm',
      type: 'combo',
      price: '1',
      cost: '0',
      unit: 'Cái',
      tax_rate: 8,
      sold: 0,
      status: 'active',
      channels: [],
      description: '',
      attrs: [],
      stock: null,
      sessions: null,
      valid_days: null,
      tint: '',
      ink: '',
      icon: '',
      duration_min: 45,
      deposit: '200000',
      rental_unit: 'day',
      components: [{ id: 'c', name: 'Serum', qty: 2 }],
      attr_defs: [{ name: 'Màu', values: ['Đỏ', 'Đen'] }],
    } satisfies Product;
    const x = initialDraft(['Sản phẩm'], p);
    expect(x).toMatchObject({
      duration: '45',
      deposit: '200000',
      combo: [{ name: 'Serum', value: '2' }],
      attrs: [{ name: 'Màu', value: 'Đỏ/Đen' }],
    });
  });
});
