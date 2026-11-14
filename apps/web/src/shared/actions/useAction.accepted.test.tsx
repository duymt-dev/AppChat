// TIP-032b: useAction nhận 202 job_accepted — việc nền đã nhận, CHƯA xong: `run` trả null (không giả kết quả 200), `accepted` + onAccepted
// giữ handle (job_id, status_url) cho màn theo dõi, toast "đã nhận — đang chạy nền" (không phải "đã thực hiện"), không invalidate như hoàn
// tất, không gọi lại action. Đi qua xem trước (bulk): preview → xác nhận → job_accepted (một lần xác nhận, không xếp việc hai lần).
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const action = vi.fn();
const info = vi.fn();
const open = vi.fn();
const ask = vi.fn();
vi.mock('../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a) } }));
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { info, open, error: vi.fn() } }) } }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string, v?: Record<string, string>) => (v ? `${k}:${JSON.stringify(v)}` : k) }));
vi.mock('./confirm-store', () => ({ useConfirmStore: (sel: (s: { ask: typeof ask }) => unknown) => sel({ ask }) }));

import { useAction } from './useAction';

const JOB = { status: 'job_accepted', job_id: 'imp_1', action_log_id: 'al_1', status_url: '/v1/product-imports/imp_1' } as const;

function setup() {
  const qc = new QueryClient();
  const spy = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { spy, wrapper };
}

describe('useAction — job_accepted', () => {
  beforeEach(() => {
    action.mockReset();
    info.mockReset();
    open.mockReset();
    ask.mockReset();
  });

  it('preview → xác nhận → 202 job_accepted: run null, accepted giữ handle, toast đang chạy nền, không invalidate catalog', async () => {
    action.mockResolvedValueOnce({ status: 202, data: { status: 'preview_required', preview: { summary: 'sp.csv · 800', risk: 'write' }, confirm_token: 'ct1', expires_at: '' } });
    action.mockResolvedValueOnce({ status: 202, data: JOB });
    ask.mockResolvedValue(true);
    const { spy, wrapper } = setup();
    const onAccepted = vi.fn();
    const { result } = renderHook(() => useAction('product.import'), { wrapper });
    let out: unknown = 'unset';
    await act(async () => {
      out = await result.current.run({ file_id: 'f1', mapping: { name: 'Tên', price: 'Giá' } }, { onAccepted });
    });
    expect(out).toBeNull();
    expect(action).toHaveBeenCalledTimes(2);
    expect(action.mock.calls[1]![2]).toMatchObject({ confirmToken: 'ct1' });
    expect(onAccepted).toHaveBeenCalledWith(JOB);
    expect(result.current.accepted).toEqual(JOB);
    expect(String(info.mock.calls[0]![0])).toContain('actions.jobAccepted');
    expect(open).not.toHaveBeenCalled();
    expect(spy).not.toHaveBeenCalled();
  });

  it('huỷ ở bước xem trước → không gửi lần hai, không accepted', async () => {
    action.mockResolvedValueOnce({ status: 202, data: { status: 'preview_required', preview: { summary: 'x', risk: 'write' }, confirm_token: 'ct2', expires_at: '' } });
    ask.mockResolvedValue(false);
    const { wrapper } = setup();
    const { result } = renderHook(() => useAction('product.import'), { wrapper });
    await act(async () => {
      await result.current.run({ file_id: 'f1', mapping: { name: 'Tên', price: 'Giá' } });
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.accepted).toBeNull();
  });
});
