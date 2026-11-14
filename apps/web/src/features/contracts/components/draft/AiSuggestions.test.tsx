// AI soạn hợp đồng (TIP-030b spec 9, 11, 18): hook hai bước — cùng nội dung → cùng request_key (không soạn lại), đổi nội dung → khoá mới;
// hết credit → lỗi riêng; "Tạo nháp" gọi draft_from_content đúng proposal_id. Khối gợi ý: Giữ / Bỏ gửi đúng version; xung đột → cảnh báo.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';
import { useContractDraft } from '../../hooks/useContractDraft';

const prepare = vi.fn();
const create = vi.fn();
vi.mock('@/shared/actions/useAction', () => ({ useAction: (id: string) => ({ run: id === 'contract.prepare_draft' ? prepare : create, isPending: false, accepted: null }) }));

const PROPOSAL = { proposal_id: 'p1', content_hash: 'h', expires_at: '', title: 'HĐ', value: '4500000', start_date: null, end_date: null, lines: [], suggestions: [{ id: 's1', text: 'Bảo hành' }], off_catalog: 0, run_id: null, model: null };
const ASK = { contact_id: 'ct1', kind: 'service' as const, brief: 'Liệu trình trị mụn x1' };

afterEach(() => {
  cleanup();
  prepare.mockReset();
  create.mockReset();
});

describe('useContractDraft', () => {
  it('cùng nội dung → cùng request_key; đổi brief → khoá mới; không gửi quote_id rỗng', async () => {
    prepare.mockResolvedValue({ result: PROPOSAL });
    const { result } = renderHook(() => useContractDraft());
    await act(() => result.current.ask(ASK));
    await act(() => result.current.ask(ASK));
    await act(() => result.current.ask({ ...ASK, brief: 'Khác x2' }));
    const keys = prepare.mock.calls.map((c) => (c[0] as { request_key: string }).request_key);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
    expect(prepare.mock.calls[0]![0]).not.toHaveProperty('quote_id');
    expect(result.current.proposal?.proposal_id).toBe('p1');
  });

  it('hết credit → lỗi `credit`, không có đề xuất', async () => {
    prepare.mockImplementation(async (_i, o: { onError: (e: ApiRequestError) => boolean }) => {
      o.onError(new ApiRequestError(402, { code: 'CREDIT_EXHAUSTED', message: 'x' }));
      return null;
    });
    const { result } = renderHook(() => useContractDraft());
    await act(() => result.current.ask(ASK));
    expect(result.current).toMatchObject({ error: 'credit', proposal: null });
  });

  it('Tạo nháp → draft_from_content đúng proposal_id (không soạn lại)', async () => {
    prepare.mockResolvedValue({ result: PROPOSAL });
    create.mockResolvedValue({ result: { contract_id: 'c1', code: 'HĐ-1', pending_suggestions: 1 } });
    const { result } = renderHook(() => useContractDraft());
    await act(() => result.current.ask(ASK));
    const r = await act(() => result.current.accept());
    expect(create).toHaveBeenCalledWith({ proposal_id: 'p1' });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(r).toMatchObject({ result: { contract_id: 'c1' } });
  });
});
