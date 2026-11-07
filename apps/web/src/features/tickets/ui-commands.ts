// UiCommand của Ticket (frontend-structure §8): điền form tạo ticket, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useTicketsUi } from './tickets-store';
import type { TicketFilter } from './types';

export function useTicketsUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useTicketsUi.getState().set({ prefill: cmd.values, form: true });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useTicketsUi.getState().set({ detail: cmd.id, tab: 'detail' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useTicketsUi.getState().setFilter(cmd.filter as Partial<TicketFilter>);
  }, []);
  useUiCommand('prefill:ticket.form', prefill);
  useUiCommand('open:ticket', open);
  useUiCommand('filter:tickets', filter);
}
