// UiCommand của Marketing (frontend-structure §8): điền wizard tạo chiến dịch, mở chi tiết chiến dịch, lọc danh sách.
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useMarketingUi } from './marketing-store';
import type { CampaignFilter } from './types';

export function useMarketingUiCommands() {
  const prefill = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'prefill') useMarketingUi.getState().set({ prefill: cmd.values, wizard: true, fromSuggestion: null });
  }, []);
  const open = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open') useMarketingUi.getState().set({ detail: cmd.id, tab: 'recipients' });
  }, []);
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useMarketingUi.getState().setFilter(cmd.filter as Partial<CampaignFilter>);
  }, []);
  useUiCommand('prefill:campaign.form', prefill);
  useUiCommand('open:campaign', open);
  useUiCommand('filter:campaigns', filter);
}
