// TIP-015d §4.4–4.5: mỗi khách một action riêng; kết quả theo khách lấy từ server — chuyển thật (đếm), đã là người phụ trách (bỏ qua), chờ
// duyệt (không tính đã chuyển), lỗi (mã); "Dừng" chỉ dừng giữa các khách, khách đã chuyển giữ nguyên; gửi if_version khi có.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';

type Opts = { onAccepted?: (a: { status: string }) => void; onError?: (e: ApiRequestError) => boolean };
const s = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run: s.run, isPending: false }) }));

import { summarize, useContactTransfer } from './useContactTransfer';

const MOVE = { conversations: true, quotes: true, appointments: false };
const moved = (c: number, q: number) => ({ conversations: c, quotes: q, appointments: 0 });

describe('useContactTransfer', () => {
  beforeEach(() => s.run.mockReset());
  afterEach(cleanup);

  it('phân loại kết quả theo từng khách từ server', async () => {
    s.run.mockImplementation(async (input: { contact_id: string }, o: Opts) => {
      if (!input) return null; // lần gọi không đối số (không phải luồng hook) — bỏ qua; số lần gọi thật kiểm ở dưới
      if (input.contact_id === 'a') return { result: { status: 'transferred', owner_user_id: 'u', moved: moved(2, 1), transfer_id: 't1', version: 3 }, action_log_id: 'l1' };
      if (input.contact_id === 'b') return { result: { status: 'skipped_already_owner', owner_user_id: 'u', moved: moved(0, 0), transfer_id: null, version: 1 }, action_log_id: 'l2' };
      if (input.contact_id === 'c') {
        o.onAccepted?.({ status: 'approval_required' });
        return null;
      }
      o.onError?.(new ApiRequestError(409, { code: 'STALE_VERSION', message: 'x' }));
      return null;
    });
    const { result } = renderHook(() => useContactTransfer());
    let out: Awaited<ReturnType<typeof result.current.run>> = [];
    await act(async () => {
      out = await result.current.run([{ contactId: 'a' }, { contactId: 'b' }, { contactId: 'c' }, { contactId: 'd', version: 7 }], 'u', MOVE);
    });
    expect(s.run).toHaveBeenCalledTimes(4);
    expect(out.map((r) => r.kind)).toEqual(['transferred', 'skipped', 'pending_approval', 'error']);
    expect(out[3]).toMatchObject({ code: 'STALE_VERSION' });
    expect(s.run.mock.calls[3]![0]).toMatchObject({ contact_id: 'd', if_version: 7 });
    expect(s.run.mock.calls[3]![1]).toMatchObject({ silent: true });
    expect(s.run.mock.calls.map((c) => (c[0] as { contact_id?: string } | undefined)?.contact_id ?? 'NONE')).toEqual(['a', 'b', 'c', 'd']);
    expect(summarize(out)).toEqual({ transferred: 1, skipped: 1, pending: 1, errors: 1, cancelled: 0, moved: moved(2, 1) });
  });

  it('một khách: không im lặng (toast + Hoàn tác của useAction)', async () => {
    s.run.mockResolvedValue({ result: { status: 'transferred', owner_user_id: 'u', moved: moved(0, 0), transfer_id: 't', version: 2 }, action_log_id: 'l' });
    const { result } = renderHook(() => useContactTransfer());
    await act(async () => {
      await result.current.run([{ contactId: 'a' }], 'u', MOVE, 'ghi chú');
    });
    expect(s.run.mock.calls[0]![0]).toMatchObject({ note: 'ghi chú' });
    expect(s.run.mock.calls[0]![1]).toMatchObject({ silent: false });
  });

  it('Dừng giữa chừng: khách đã chuyển giữ nguyên, khách còn lại "đã dừng"', async () => {
    const { result } = renderHook(() => useContactTransfer());
    s.run.mockImplementation(async () => {
      result.current.cancel();
      return { result: { status: 'transferred', owner_user_id: 'u', moved: moved(1, 0), transfer_id: 't', version: 2 }, action_log_id: 'l' };
    });
    let out: Awaited<ReturnType<typeof result.current.run>> = [];
    await act(async () => {
      out = await result.current.run([{ contactId: 'a' }, { contactId: 'b' }, { contactId: 'c' }], 'u', MOVE);
    });
    expect(out.map((r) => r.kind)).toEqual(['transferred', 'cancelled', 'cancelled']);
    expect(s.run).toHaveBeenCalledTimes(1);
  });
});
