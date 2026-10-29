// UiCommand của products: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useProductsUiCommands } from './ui-commands';
import { useProductsUi } from './products-store';

describe('products ui-commands', () => {
  it('prefill mở form tạo / sửa, open mở drawer, filter đổi danh mục', () => {
    const { unmount } = renderHook(() => useProductsUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'product.form', values: { name: 'Serum', price: '500000' } });
    expect(useProductsUi.getState()).toMatchObject({
      form: 'create',
      target: null,
      prefill: { name: 'Serum', price: '500000' },
    });
    dispatchUiCommand({ type: 'prefill', form: 'product.form', values: { product_id: 'pd_2', price: '1' } });
    expect(useProductsUi.getState()).toMatchObject({ form: 'edit', target: 'pd_2', prefill: { price: '1' } });
    dispatchUiCommand({ type: 'open', entity: 'product', id: 'pd_3' });
    expect(useProductsUi.getState().detail).toBe('pd_3');
    dispatchUiCommand({ type: 'filter', table: 'products', filter: { category: 'Combo' } });
    expect(useProductsUi.getState().filter.category).toBe('Combo');
    unmount();
  });
});
