// Khối qr (TIP-023c hợp đồng 1–2): seed từ ref `channel.status`; poll 2 giây khi chưa kết thúc; ảnh lấy từ `qr_ref` của đúng attempt
// (GET có auth); connected TRONG lần mount → assistant.resume đúng một lần + onExternal; dừng poll ở trạng thái cuối / unmount. Mở lại
// phiên đã connected → không poll, không resume. Ref mất quyền → Không có dữ liệu.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { RUN, part, renderUi } from './test-utils';

const action = vi.fn();
const get = vi.fn();
vi.mock('../../api/client', () => ({ transport: { action: (...a: unknown[]) => action(...a), get: (...a: unknown[]) => get(...a), post: vi.fn() } }));
vi.mock('../../authz/useCan', () => ({ useCan: () => true }));

const ACC = '01900000-0000-7000-8000-0000000000aa';
const login = (status: string, extra: Record<string, unknown> = {}) => ({ attempt: 'att-12345678', status, expires_at: null, qr_ref: null, terminal: ['connected', 'expired', 'failed'].includes(status), ...extra });
const statusOut = (l: ReturnType<typeof login>) => ({ status: 200, data: { result: { channel_account_id: ACC, type: 'zalo_personal', name: 'Zalo', account_status: 'connecting', login: l }, action_log_id: 'x' } });
const block = { type: 'qr' as const, login: { $ref: 'step:4' } };

describe('QrBlock', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    action.mockReset();
    get.mockReset();
  });
  afterEach(() => vi.useRealTimers());

  it('waiting (ảnh đúng attempt) → scanned → connected: resume một lần, dừng poll', async () => {
    const onExternal = vi.fn();
    action
      .mockResolvedValueOnce(statusOut(login('waiting', { qr_ref: `/assistant/ui/qr/${ACC}?attempt=att-12345678` })))
      .mockResolvedValueOnce(statusOut(login('scanned')))
      .mockResolvedValueOnce(statusOut(login('connected')))
      .mockResolvedValue({ status: 200, data: { result: { resumed: true, status: 'connected' }, action_log_id: 'r' } });
    get.mockResolvedValue({ png_base64: 'iVBORw0KGgo=' });
    renderUi(part(block, { 'step:4': { channel_account_id: ACC, login: login('waiting') } }), 'full', { onExternal });
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(get).toHaveBeenCalledWith(`/assistant/ui/qr/${ACC}`, { attempt: 'att-12345678' });
    expect(screen.getByTestId('genui-qr-img').getAttribute('src')).toBe('data:image/png;base64,iVBORw0KGgo=');
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByTestId('genui-qr').getAttribute('data-status')).toBe('scanned');
    expect(screen.queryByTestId('genui-qr-img')).toBeNull();
    await act(async () => vi.advanceTimersByTimeAsync(2000));
    expect(screen.getByTestId('genui-qr').getAttribute('data-status')).toBe('connected');
    const resumes = action.mock.calls.filter(([id]) => id === 'assistant.resume');
    expect(resumes).toEqual([['assistant.resume', { run_id: RUN, node: '', channel_account_id: ACC, attempt: 'att-12345678' }]]);
    expect(onExternal).toHaveBeenCalledOnce();
    const before = action.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(10_000));
    expect(action.mock.calls.length).toBe(before);
  });

  it('mở lại phiên đã connected → không poll, không resume', async () => {
    renderUi(part(block, { 'step:4': { channel_account_id: ACC, login: login('connected') } }));
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByTestId('genui-qr-status').textContent).toBe('Đã kết nối');
  });

  it('từ chối trên điện thoại → failed(declined) + Tạo mã mới; unmount dừng poll', async () => {
    action.mockResolvedValue(statusOut(login('failed', { reason: 'declined' })));
    const { unmount } = renderUi(part(block, { 'step:4': { channel_account_id: ACC, login: login('waiting') } }));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByTestId('genui-qr-status').textContent).toBe('Bạn đã từ chối đăng nhập trên điện thoại');
    expect(screen.getByTestId('genui-qr-regenerate')).toBeTruthy();
    unmount();
    const n = action.mock.calls.length;
    await act(async () => vi.advanceTimersByTimeAsync(6000));
    expect(action.mock.calls.length).toBe(n);
  });

  it('ref mất quyền → Không có dữ liệu, không gọi gì', async () => {
    renderUi(part(block, { 'step:4': { unavailable: true } }));
    await act(async () => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByTestId('genui-nodata')).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
  });
});
