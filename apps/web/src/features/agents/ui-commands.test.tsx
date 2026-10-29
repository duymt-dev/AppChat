// UiCommand của agents: Trợ lý phát lệnh → state màn đổi đúng (prefill / open / filter).
import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { dispatchUiCommand } from '@/shared/assistant/ui-command-bus';
import { useAgentsUiCommands } from './ui-commands';
import { useAgentsUi } from './agents-store';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

describe('agents ui-commands', () => {
  it('AI Agents: prefill đưa bản nháp sang builder, open page / drawer, filter thư viện mẫu', () => {
    renderHook(() => useAgentsUiCommands());
    dispatchUiCommand({ type: 'prefill', form: 'agent.form', values: { name: 'CSKH Spa', model_tier: 'advanced' } });
    expect(useAgentsUi.getState().handoff).toMatchObject({ name: 'CSKH Spa' });
    expect(push).toHaveBeenLastCalledWith('/agents/new?from=ai');
    dispatchUiCommand({ type: 'open', entity: 'agent', id: 'ag_sales', view: 'page' });
    expect(push).toHaveBeenLastCalledWith('/agents/ag_sales');
    dispatchUiCommand({ type: 'open', entity: 'agent', id: 'ag_sales', view: 'drawer' });
    expect(useAgentsUi.getState().versionsFor).toBe('ag_sales');
    useAgentsUi.getState().set({ tplPage: 3 });
    dispatchUiCommand({ type: 'filter', table: 'agent_templates', filter: { group: 'Dịch vụ & CSKH' } });
    expect(useAgentsUi.getState()).toMatchObject({ tplFilter: { group: 'Dịch vụ & CSKH', q: '' }, tplPage: 1 });
  });
});
