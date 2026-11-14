// UiCommand của Hợp đồng (frontend-structure §8): điền form tạo hợp đồng, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useContractsUi } from './contracts-store';
import type { ContractFilter } from './types';

/** `prefill:contract.form` — đăng ký MỘT lần ở FormCommandHost toàn cục (TIP-025b §D.3), không theo màn: Trợ lý điền form khi màn chưa mở. */
export function prefillContractsForm(cmd: UiCommand) {
  if (cmd.type === 'prefill') useContractsUi.getState().set({ prefill: cmd.values, form: 'create' });
}

export function useContractsUiCommands() {
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useContractsUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useContractsUi.getState().setFilter(cmd.filter as Partial<ContractFilter>);
  }, []);
  useUiCommand('open:contract', open);
  useUiCommand('filter:contracts', filter);
}
