// UiCommand của Sản phẩm (frontend-structure §8): điền form thêm / sửa, mở drawer chi tiết, lọc danh mục / từ khoá.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useProductsUi } from './products-store';
import type { ProductFilter } from './types';

export function useProductsUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type !== 'prefill') return;
    const { product_id, ...values } = cmd.values;
    useProductsUi
      .getState()
      .set({
        prefill: values,
        form: product_id ? 'edit' : 'create',
        target: product_id ? String(product_id) : null,
      });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useProductsUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useProductsUi.getState().setFilter(cmd.filter as Partial<ProductFilter>);
  }, []);
  useUiCommand('prefill:product.form', prefill);
  useUiCommand('open:product', open);
  useUiCommand('filter:products', filter);
}
