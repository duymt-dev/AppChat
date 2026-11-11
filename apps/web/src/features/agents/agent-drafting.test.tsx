// TIP-021b §3.3 (AC7): giao diện soạn agent — request_id giữ nguyên khi thử lại cùng mô tả, đổi khi mô tả đổi / "Soạn lại"; lỗi giữ
// mô tả + phân loại thử lại; thẻ đề xuất nói thật nguồn (mẫu có lý do ≠ AI) + cảnh báo + tool kèm rủi ro; hai đường xác nhận giữ nguyên.
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { ApiRequestError } from '@appchat/shared';
import agents from '../../../messages/vi/agents.json';
import actions from '../../../messages/vi/actions.json';
import assistant from '../../../messages/vi/assistant.json';
import { useAgentDrafting } from './hooks/useAgentDrafting';
import { AgentDraftProposal } from './components/AgentDraftProposal';
import type { AgentDraftResult } from './types';

const run = vi.fn();
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run, isPending: false, accepted: null }) }));
afterEach(cleanup);
beforeEach(() => run.mockReset());

const info = (over: Partial<AgentDraftResult['generation_info']> = {}): AgentDraftResult['generation_info'] => ({
  schema_version: 1, operation_id: 'op', mode: 'model', discovery_strategy: 'hybrid', warnings: [], candidate_version: 'f', ...over,
});
const draft = { name: 'CSKH Spa', emoji: '🎧', role: 'cs', role_label: '', persona: '', keywords: [], working_hours: 'always', language: 'vi', prompt: '', intents: [2], model_tier: 'standard', tools: ['ticket.create'], channels: ['zalo_personal'], threshold: 75, handoff_to: 'staff', governance: {}, kb_scope: { folder_ids: [], tags: [] } } as unknown as AgentDraftResult['draft'];
const ok = (gi = info()) => ({ result: { draft, generation_info: gi }, action_log_id: 'l' });

describe('useAgentDrafting — định danh lần soạn', () => {
  it('thử lại cùng mô tả dùng lại request_id; mô tả khác / soạn lại → request_id mới; mô tả không vào query', async () => {
    run.mockResolvedValue(ok());
    const { result } = renderHook(() => useAgentDrafting());
    await act(() => result.current.draft('Agent CSKH spa'));
    await act(() => result.current.draft('Agent CSKH spa'));
    await act(() => result.current.draft('Agent bán hàng'));
    await act(() => result.current.draft('Agent bán hàng', { regenerate: true }));
    const ids = run.mock.calls.map((c) => (c[0] as { request_id: string }).request_id);
    expect(ids[0]).toBe(ids[1]);
    expect(ids[2]).not.toBe(ids[1]);
    expect(ids[3]).not.toBe(ids[2]);
    expect(run.mock.calls[0]![0]).toEqual({ description: 'Agent CSKH spa', request_id: ids[0] });
  });

  it('lỗi chưa rõ (INVALID_STATE) → failure retrySame; 409 mô tả khác → không retrySame; kết quả cũ không bị xoá giả', async () => {
    run.mockImplementationOnce(async (_i, o: { onError: (e: ApiRequestError) => boolean }) => (o.onError(new ApiRequestError(409, { code: 'INVALID_STATE', message: 'x' })), null));
    const { result } = renderHook(() => useAgentDrafting());
    await act(() => result.current.draft('Agent CSKH spa'));
    expect(result.current.failure).toEqual({ code: 'INVALID_STATE', retrySame: true });
    expect(result.current.result).toBeNull();
    run.mockImplementationOnce(async (_i, o: { onError: (e: ApiRequestError) => boolean }) => (o.onError(new ApiRequestError(409, { code: 'CONFLICT', message: 'x' })), null));
    await act(() => result.current.draft('Agent CSKH spa'));
    expect(result.current.failure).toEqual({ code: 'CONFLICT', retrySame: false });
  });
});

const renderProposal = (v: AgentDraftResult, h: Partial<Record<'onPublish' | 'onBuilder' | 'onRegenerate', () => void>> = {}) =>
  render(
    <NextIntlClientProvider locale="vi" timeZone="Asia/Ho_Chi_Minh" messages={{ agents, actions, assistant }}>
      <AgentDraftProposal value={v} publishing={false} onPublish={h.onPublish ?? vi.fn()} onBuilder={h.onBuilder ?? vi.fn()} onRegenerate={h.onRegenerate ?? vi.fn()} />
    </NextIntlClientProvider>,
  );

describe('AgentDraftProposal — nói thật nguồn', () => {
  it('mode model → lời dẫn AI; tool kèm mức rủi ro; hai nút xác nhận + soạn lại', () => {
    const on = { onPublish: vi.fn(), onBuilder: vi.fn(), onRegenerate: vi.fn() };
    renderProposal({ draft, generation_info: info() }, on);
    expect(screen.getByTestId('ag-ai-mode').dataset.mode).toBe('model');
    expect(screen.getByTestId('ag-ai-mode').textContent).toBe(agents.ai.draftLead);
    expect(screen.getByTestId('ag-ai-tools').textContent).toContain(assistant.ap.risk.write);
    fireEvent.click(screen.getByTestId('ag-ai-publish'));
    fireEvent.click(screen.getByTestId('ag-ai-builder'));
    fireEvent.click(screen.getByTestId('ag-ai-regenerate'));
    expect([on.onPublish, on.onBuilder, on.onRegenerate].every((f) => f.mock.calls.length === 1)).toBe(true);
  });

  it('mẫu tất định → lời dẫn theo lý do (không gắn nhãn AI) + cảnh báo; tools rỗng có câu giải thích', () => {
    renderProposal({ draft: { ...draft, tools: [] }, generation_info: info({ mode: 'deterministic', fallback_reason: 'no_model_route', warnings: ['no_candidate_tools', 'keyword_discovery'] }) });
    expect(screen.getByTestId('ag-ai-mode').textContent).toBe(agents.ai.fallback.no_model_route);
    expect(screen.getByTestId('ag-ai-mode').textContent).not.toBe(agents.ai.draftLead);
    expect(screen.getByTestId('ag-ai-warnings').textContent).toContain(agents.ai.warn.no_candidate_tools);
    expect(screen.getByTestId('ag-ai-tools').textContent).toBe(agents.ai.noTools);
  });
});
