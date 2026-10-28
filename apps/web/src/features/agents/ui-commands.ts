// UiCommand của AI Agents (frontend-structure §8): điền builder (qua bản nháp), mở builder / lịch sử phiên bản, lọc thư viện mẫu.
'use client';
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UiCommand } from '@appchat/actions';
import { useUiCommand } from '@/shared/assistant/ui-command-bus';
import { useAgentsUi } from './agents-store';
import type { AgentConfig, TemplateFilter } from './types';

export function useAgentsUiCommands() {
  const router = useRouter();
  const prefill = useCallback(
    (cmd: UiCommand) => {
      if (cmd.type !== 'prefill') return;
      useAgentsUi.getState().set({ handoff: cmd.values as Partial<AgentConfig> });
      router.push('/agents/new?from=ai');
    },
    [router],
  );
  const open = useCallback(
    (cmd: UiCommand) => {
      if (cmd.type !== 'open') return;
      if (cmd.view === 'drawer') useAgentsUi.getState().set({ versionsFor: cmd.id });
      else router.push(`/agents/${cmd.id}`);
    },
    [router],
  );
  const filter = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'filter') useAgentsUi.getState().setTplFilter(cmd.filter as Partial<TemplateFilter>);
  }, []);
  useUiCommand('prefill:agent.form', prefill);
  useUiCommand('open:agent', open);
  useUiCommand('filter:agent_templates', filter);
}
