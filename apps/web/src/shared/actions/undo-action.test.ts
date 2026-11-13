// TIP-034c §3.4 — cầu nối hoàn tác: chỉ đúng 409 UNDO_REQUIRES_ACTION (action trong danh sách cho phép + log khớp) mới chạy action hoàn tác
// chuẩn qua xem trước / xác nhận; mã khác / action lạ / log lệch / cặp sai → ném lỗi như cũ, không bao giờ báo "đã hoàn tác" giả.
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiRequestError } from '@appchat/shared';

const action = vi.fn();
const undo = vi.fn();
vi.mock('../api/client', () => ({
  transport: { action: (...a: unknown[]) => action(...a), undo: (...a: unknown[]) => undo(...a) },
}));

import { bridgeTarget, undoLog } from './undo-action';

const LOG = '0190f3a2-7b1c-7d10-9a5e-4c2b1f0e9a01';
const bridge = (fields: Record<string, string>, status = 409, code = 'UNDO_REQUIRES_ACTION') =>
  new ApiRequestError(status, { code: code as never, message: 'x', fields });
const ok = { undo_action: 'ticket.bulk_undo', parent_action_log_id: LOG };
const ask = vi.fn();

describe('bridgeTarget', () => {
  it('đúng mã + action cho phép + log khớp → action hoàn tác', () => {
    expect(bridgeTarget(bridge(ok), LOG)).toBe('ticket.bulk_undo');
    expect(bridgeTarget(bridge(ok), LOG, 'ticket.bulk_update')).toBe('ticket.bulk_undo');
  });

  it('mã khác / status khác / action lạ / log lệch / cặp sai → null', () => {
    expect(bridgeTarget(bridge(ok, 409, 'CONFLICT'), LOG)).toBeNull();
    expect(bridgeTarget(bridge(ok, 400), LOG)).toBeNull();
    expect(bridgeTarget(bridge({ ...ok, undo_action: 'workspace.delete' }), LOG)).toBeNull();
    expect(bridgeTarget(bridge({ ...ok, parent_action_log_id: 'khac' }), LOG)).toBeNull();
    expect(bridgeTarget(bridge(ok), LOG, 'ticket.update')).toBeNull();
    expect(bridgeTarget(new Error('x'), LOG)).toBeNull();
  });
});

describe('undoLog', () => {
  beforeEach(() => {
    action.mockReset();
    undo.mockReset();
    ask.mockReset();
  });

  it('hoàn tác thường thành công → undone, không gọi action', async () => {
    undo.mockResolvedValueOnce(undefined);
    await expect(undoLog(LOG, { ask })).resolves.toEqual({ kind: 'undone' });
    expect(action).not.toHaveBeenCalled();
  });

  it('409 bridge → xem trước → xác nhận → 200: kết quả từng bản ghi (không phải undone)', async () => {
    undo.mockRejectedValueOnce(bridge(ok));
    action.mockResolvedValueOnce({
      status: 202,
      data: {
        status: 'preview_required',
        preview: { summary: '3', risk: 'write' },
        confirm_token: 'ct',
        expires_at: '',
      },
    });
    const result = {
      action_log_id: 'u1',
      result: { undone: 2, conflicts: 1, failed: 1, outcomes: [], operation: null },
    };
    action.mockResolvedValueOnce({ status: 200, data: result });
    ask.mockResolvedValue(true);
    const out = await undoLog(LOG, { ask, parentActionId: 'ticket.bulk_update' });
    expect(out).toEqual({ kind: 'action', actionId: 'ticket.bulk_undo', result, accepted: null });
    expect(action.mock.calls[0]![1]).toEqual({ parent_action_log_id: LOG });
    // Cùng khoá idempotency qua xem trước / xác nhận; lần 2 mang confirm_token.
    expect(action.mock.calls[1]![2]).toMatchObject({
      confirmToken: 'ct',
      idempotencyKey: action.mock.calls[0]![2].idempotencyKey,
    });
  });

  it('huỷ xem trước → cancelled; 202 việc nền → accepted', async () => {
    undo.mockRejectedValue(bridge(ok));
    action.mockResolvedValueOnce({
      status: 202,
      data: {
        status: 'preview_required',
        preview: { summary: '3', risk: 'write' },
        confirm_token: 'ct',
        expires_at: '',
      },
    });
    ask.mockResolvedValueOnce(false);
    await expect(undoLog(LOG, { ask })).resolves.toEqual({ kind: 'cancelled' });
    const job = { status: 'job_accepted', job_id: 'j', action_log_id: 'u2', status_url: '/v1/data-jobs/j' };
    action.mockResolvedValueOnce({
      status: 202,
      data: {
        status: 'preview_required',
        preview: { summary: '3', risk: 'write' },
        confirm_token: 'ct',
        expires_at: '',
      },
    });
    action.mockResolvedValueOnce({ status: 202, data: job });
    ask.mockResolvedValueOnce(true);
    await expect(undoLog(LOG, { ask })).resolves.toMatchObject({
      kind: 'action',
      result: null,
      accepted: job,
    });
  });

  it('lỗi không phải bridge → ném nguyên lỗi', async () => {
    const e = bridge({}, 409, 'UNDO_EXPIRED');
    undo.mockRejectedValueOnce(e);
    await expect(undoLog(LOG, { ask })).rejects.toBe(e);
    expect(action).not.toHaveBeenCalled();
  });
});
