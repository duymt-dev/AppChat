// UiCommand của Lịch hẹn (frontend-structure §8): điền form tạo lịch, mở drawer, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useCalendarUi } from './calendar-store';
import type { CalFilter } from './types';

/** `prefill:appointment.form` — đăng ký MỘT lần ở FormCommandHost toàn cục (TIP-025b §D.3), không theo màn: Trợ lý điền form khi màn chưa mở. */
export function prefillCalendarForm(cmd: UiCommand) {
  if (cmd.type === 'prefill') useCalendarUi.getState().set({ prefill: cmd.values, form: 'create' });
}

export function useCalendarUiCommands() {
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useCalendarUi.getState().set({ detail: cmd.id });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useCalendarUi.getState().setFilter(cmd.filter as Partial<CalFilter>);
  }, []);
  useUiCommand('open:appointment', open);
  useUiCommand('filter:calendar', filter);
}
