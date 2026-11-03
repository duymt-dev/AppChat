// Nguồn tệp của form tạo hợp đồng (TIP-030b spec 18): chọn tệp → tải lên purpose document → inspect_file → đề xuất; guard từ chối → lỗi có
// lý do + thử lại (không giả là đã lưu, `blocked` giữ form không lưu); quá cỡ chặn sớm; "Dùng mẫu theo loại" quay về nguồn mẫu.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';
import { transport } from '@/shared/api/client';
import { SOURCE_MAX_BYTES, useContractSource } from '../../hooks/useContractSource';

const run = vi.fn();
vi.mock('@/shared/actions/useAction', () => ({ useAction: () => ({ run, isPending: false, accepted: null }) }));

const file = (name: string, size = 10) => new File([new Uint8Array(size)], name, { type: 'application/pdf' });
const INSPECTION = { file_id: 'f1', name: 'hd.pdf', type: 'pdf', pages: 2, sha256: 'x', extraction: 'ok', fields: { title: null, party_b: null, value: { value: '7500000', confidence: 0.8, source: 'Giá trị: 7.500.000' }, start_date: null, end_date: null } };

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  run.mockReset();
});

describe('useContractSource', () => {
  it('mặc định nguồn mẫu → không gửi source, không chặn lưu', () => {
    const { result } = renderHook(() => useContractSource());
    expect(result.current).toMatchObject({ kind: 'template', source: undefined, blocked: false });
  });

  it('chọn tệp → tải lên document → inspect_file → ready + source file', async () => {
    vi.spyOn(transport, 'upload').mockResolvedValue({ file_id: 'f1', name: 'hd.pdf', size: 10 });
    run.mockResolvedValue({ result: INSPECTION });
    const { result } = renderHook(() => useContractSource());
    act(() => void result.current.pick(file('hd.pdf')));
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(transport.upload).toHaveBeenCalledWith(expect.any(File), 'document', expect.any(AbortSignal));
    expect(run).toHaveBeenCalledWith({ file_id: 'f1' }, expect.objectContaining({ silent: true }));
    expect(result.current.source).toEqual({ type: 'file', file_id: 'f1' });
    expect(result.current.inspection?.fields.value?.value).toBe('7500000');
    expect(result.current.blocked).toBe(false);
  });

  it('guard từ chối (macro) → error có lý do, chặn lưu; thử lại gọi lại đúng tệp', async () => {
    const up = vi.spyOn(transport, 'upload').mockResolvedValue({ file_id: 'f2', name: 'm.docx', size: 10 });
    run.mockImplementationOnce(async (_i, o: { onError: (e: ApiRequestError) => boolean }) => {
      o.onError(new ApiRequestError(422, { code: 'VALIDATION_FAILED', message: 'file', fields: { file: 'macro' } }));
      return null;
    });
    const { result } = renderHook(() => useContractSource());
    act(() => void result.current.pick(file('m.docx')));
    await waitFor(() => expect(result.current.phase).toBe('error'));
    expect(result.current).toMatchObject({ error: 'macro', source: undefined, blocked: true });
    run.mockResolvedValueOnce({ result: INSPECTION });
    act(() => void result.current.retry());
    await waitFor(() => expect(result.current.phase).toBe('ready'));
    expect(up).toHaveBeenCalledTimes(2);
  });

  it('quá cỡ → chặn trước khi tải; quay về mẫu bỏ nguồn tệp', async () => {
    const up = vi.spyOn(transport, 'upload');
    const { result } = renderHook(() => useContractSource());
    act(() => void result.current.pick(file('big.pdf', SOURCE_MAX_BYTES + 1)));
    await waitFor(() => expect(result.current.error).toBe('too_large'));
    expect(up).not.toHaveBeenCalled();
    act(() => result.current.setKind('template'));
    expect(result.current).toMatchObject({ kind: 'template', phase: 'idle', blocked: false, source: undefined });
  });
});
