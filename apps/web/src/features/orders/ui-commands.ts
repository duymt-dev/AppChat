// UiCommand của Đơn hàng (frontend-structure §8): điền form tạo đơn, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useOrdersUi } from './orders-store';
import type { OrderFilter } from './types';

export function useOrdersUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useOrdersUi.getState().set({ prefill: cmd.values, form: 'create' });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useOrdersUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useOrdersUi.getState().setFilter(cmd.filter as Partial<OrderFilter>);
  }, []);
  useUiCommand('prefill:order.form', prefill);
  useUiCommand('open:order', open);
  useUiCommand('filter:orders', filter);
}
