// UiCommand của Đề nghị thanh toán (frontend-structure §8): điền form tạo, mở drawer, lọc (tìm) danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useInvoicesUi } from './invoices-store';

export function useInvoicesUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useInvoicesUi.getState().set({ prefill: cmd.values, form: 'create' });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useInvoicesUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useInvoicesUi.getState().set({ q: String(cmd.filter.q ?? '') });
  }, []);
  useUiCommand('prefill:invoice.form', prefill);
  useUiCommand('open:invoice', open);
  useUiCommand('filter:invoices', filter);
}
