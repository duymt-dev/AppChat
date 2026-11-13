// TIP-022c §3.8b: tham chiếu mờ của nháp AI có câu tồn / giá — dùng / sửa giữ ref; gửi lỗi 409 `ai_draft` (tồn đổi / không kiểm được /
// hết hiệu lực) → bỏ ref, báo lý do riêng, chữ trong ô soạn GIỮ NGUYÊN (không tự sửa, không báo thành công); xoá trắng / đổi hội thoại bỏ ref.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { ApiRequestError } from '@appchat/shared';

const error = vi.fn();
vi.mock('antd', () => ({ App: { useApp: () => ({ message: { error } }) } }));
vi.mock('next-intl', () => ({ useTranslations: () => (k: string) => `t:${k}` }));

import { useInboxUi } from '../inbox-store';
import { useAiDraftBinding } from './useAiDraftBinding';

const REF = { id: 'run-sales', generation: 3 };
const fail = (why: string) => new ApiRequestError(409, { code: 'INVALID_STATE', message: why, fields: { ai_draft: why } });

describe('useAiDraftBinding — nháp bán hàng', () => {
  beforeEach(() => {
    error.mockReset();
    useInboxUi.getState().select('c1');
  });

  it('Dùng → ref đi kèm input gửi; sửa chữ vẫn giữ ref (không tạo provenance từ chữ)', () => {
    const { result } = renderHook(() => useAiDraftBinding());
    result.current.use('Serum: còn hàng cho 2 hộp (kiểm lúc 10:00).', REF);
    result.current.edit('Serum: còn hàng cho 2 hộp — chị chốt nhé.');
    const { result: r2 } = renderHook(() => useAiDraftBinding());
    expect(r2.current.withRef({ conversation_id: 'c1', text: 'x' })).toEqual({ conversation_id: 'c1', text: 'x', ai_draft_ref: REF });
    expect(useInboxUi.getState().draft).toBe('Serum: còn hàng cho 2 hộp — chị chốt nhé.');
  });

  it.each([
    ['stock_changed', 't:stockChanged'],
    ['stock_unverified', 't:stockUnverified'],
    ['invalidated', 't:stale'],
    ['knowledge_revoked', 't:revoked'],
  ])('409 ai_draft %s → bỏ ref, báo lý do riêng, chữ giữ nguyên', (why, msg) => {
    const { result } = renderHook(() => useAiDraftBinding());
    result.current.use('Serum: còn hàng cho 2 hộp.', REF);
    expect(result.current.onError(fail(why))).toBe(true);
    expect(error).toHaveBeenCalledWith(msg);
    expect(useInboxUi.getState()).toMatchObject({ draft: 'Serum: còn hàng cho 2 hộp.', draftRef: null, draftCitations: null });
  });

  it('lỗi không phải ai_draft → không xử lý (người gọi báo lỗi chung), ref giữ', () => {
    const { result } = renderHook(() => useAiDraftBinding());
    result.current.use('Serum: còn hàng.', REF);
    expect(result.current.onError(new ApiRequestError(409, { code: 'INVALID_STATE', message: 'x', fields: { turn: 'superseded' } }))).toBe(false);
    expect(useInboxUi.getState().draftRef).toEqual(REF);
  });

  it('xoá trắng ô soạn / đổi hội thoại → bỏ ref (tin tay mới theo luật gửi thường)', () => {
    const { result } = renderHook(() => useAiDraftBinding());
    result.current.use('Serum: còn hàng.', REF);
    result.current.edit('   ');
    expect(useInboxUi.getState().draftRef).toBeNull();
    result.current.use('Serum: còn hàng.', REF);
    useInboxUi.getState().select('c2');
    expect(useInboxUi.getState()).toMatchObject({ draft: '', draftRef: null });
  });
});
