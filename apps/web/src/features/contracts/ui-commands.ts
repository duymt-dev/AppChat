// UiCommand của Hợp đồng (frontend-structure §8): điền form tạo hợp đồng, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useContractsUi } from './contracts-store';
import type { ContractFilter } from './types';

export function useContractsUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useContractsUi.getState().set({ prefill: cmd.values, form: 'create' });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useContractsUi.getState().set({ detail: cmd.id, tab: 'overview' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useContractsUi.getState().setFilter(cmd.filter as Partial<ContractFilter>);
  }, []);
  useUiCommand('prefill:contract.form', prefill);
  useUiCommand('open:contract', open);
  useUiCommand('filter:contracts', filter);
}
