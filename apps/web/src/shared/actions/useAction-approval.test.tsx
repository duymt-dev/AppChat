// TIP-023b SPEC B.4: useAction nhận 202 approval_required — toast "đã gửi duyệt" (không phải "đã thực hiện"), `accepted` + onAccepted,
// invalidate danh sách duyệt; `run` trả null (consumer đợi 200 không nhận kết quả giả). 200 vẫn như cũ; preview vẫn qua ConfirmActionHost.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const action = vi.fn();
const info = vi.fn();
const open = vi.fn();
vi.mock('../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a) } }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { info, open, error: vi.fn() } }) } }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, string>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));

import { useAction } from './useAction';

function setup() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { spy, wrapper };
}

describe('useAction — approval_required', () => {
  beforeEach(() => {
    action.mockReset();
    info.mockReset();
    open.mockReset();
  });

  it('202 approval_required → run null, accepted + onAccepted, toast gửi duyệt, invalidate approvals; không toast "đã thực hiện"', async () => {
    action.mockResolvedValue({ status: 202, data: { status: 'approval_required', approval_id: 'ap_9' } });
    const { spy, wrapper } = setup();
    const onAccepted = vi.fn();
    const { result } = renderHook(() => useAction('quote.send'), { wrapper });
    let out: unknown = 'unset';
    await act(async () => {
      out = await result.current.run({ quote_id: 'q1' }, { onAccepted });
    });
    expect(out).toBeNull();
    expect(onAccepted).toHaveBeenCalledWith({ status: 'approval_required', approval_id: 'ap_9' });
    expect(result.current.accepted).toEqual({ status: 'approval_required', approval_id: 'ap_9' });
    expect(info).toHaveBeenCalledTimes(1);
    expect(String(info.mock.calls[0]![0])).toContain('actions.approvalSent');
    expect(open).not.toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ queryKey: ['approvals'] });
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('200 → kết quả như cũ, toast đã thực hiện, accepted rỗng', async () => {
    action.mockResolvedValue({ status: 200, data: { result: { ok: true }, action_log_id: 'l1' } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAction('contact.update'), { wrapper });
    let out: unknown;
    await act(async () => {
      out = await result.current.run({ contact_id: 'c', patch: {} });
    });
    expect(out).toEqual({ result: { ok: true }, action_log_id: 'l1' });
    expect(result.current.accepted).toBeNull();
    expect(String(open.mock.calls[0]![0].content)).toContain('actions.done');
    expect(info).not.toHaveBeenCalled();
  });

  it('silent → không toast nhưng vẫn báo accepted', async () => {
    action.mockResolvedValue({ status: 202, data: { status: 'approval_required', approval_id: 'ap_1' } });
    const { wrapper } = setup();
    const { result } = renderHook(() => useAction('quote.send'), { wrapper });
    await act(async () => {
      await result.current.run({ quote_id: 'q1' }, { silent: true });
    });
    expect(result.current.accepted).toMatchObject({ approval_id: 'ap_1' });
    expect(info).not.toHaveBeenCalled();
  });
});
