// UiCommand của Báo giá (frontend-structure §8): điền form tạo báo giá, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useQuotesUi } from './quotes-store';
import type { QuoteFilter } from './types';

/** `prefill:quote.form` — đăng ký MỘT lần ở FormCommandHost toàn cục (TIP-025b §D.3), không theo màn: Trợ lý điền form khi màn chưa mở. */
export function prefillQuotesForm(cmd: UiCommand) {
  if (cmd.type === 'prefill') useQuotesUi.getState().set({ prefill: cmd.values, form: 'create' });
}

export function useQuotesUiCommands() {
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useQuotesUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useQuotesUi.getState().setFilter(cmd.filter as Partial<QuoteFilter>);
  }, []);
  useUiCommand('open:quote', open);
  useUiCommand('filter:quotes', filter);
}
