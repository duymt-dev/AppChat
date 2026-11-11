// Soạn agent từ mô tả (TIP-021b §3.3): một `request_id` mỗi lần soạn — giữ nguyên khi thử lại sau lỗi chưa rõ (mạng / 409 đang chạy /
// usage chưa rõ) để server trả đúng kết quả cũ, đổi khi mô tả đổi hoặc bấm "Soạn lại". Lỗi giữ mô tả đã gõ (không xoá ô). Mô tả không bao
// giờ vào query-string / log — chỉ ở thân action. Không ghi agent: xuất bản là `agent.create_and_publish` riêng.
'use client';
import { useCallback, useRef, useState } from 'react';
import type { ApiRequestError } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import type { AgentDraftResult } from '../types';

/** Lỗi đáng thử lại CÙNG request_id (kết quả có thể đã có ở server). */
const RETRY_SAME = new Set(['INVALID_STATE', 'INTERNAL', 'RATE_LIMITED', 'WORKSPACE_UNAVAILABLE']);

export type DraftFailure = { code: string; retrySame: boolean } | null;

export function useAgentDrafting() {
  const act = useAction<AgentDraftResult>('agent.draft_from_description');
  const req = useRef<{ id: string; description: string } | null>(null);
  const [result, setResult] = useState<AgentDraftResult | null>(null);
  const [failure, setFailure] = useState<DraftFailure>(null);

  const draft = useCallback(
    async (description: string, opts: { regenerate?: boolean } = {}) => {
      const d = description.trim();
      if (opts.regenerate || req.current?.description !== d) req.current = { id: crypto.randomUUID(), description: d };
      setFailure(null);
      let failed: DraftFailure = null;
      const res = await act.run(
        { description: d, request_id: req.current.id },
        {
          silent: true,
          onError: (e: ApiRequestError) => {
            failed = { code: e.error.code, retrySame: RETRY_SAME.has(e.error.code) };
            // Hết Credit / quyền → toast chung của useAction vẫn hiện (popup ví); lỗi khác drawer tự hiện.
            return e.error.code !== 'CREDIT_EXHAUSTED' && e.error.code !== 'FORBIDDEN';
          },
        },
      );
      if (res) setResult(res.result);
      else setFailure(failed ?? { code: 'INTERNAL', retrySame: true });
      return res?.result ?? null;
    },
    [act],
  );

  const reset = useCallback(() => {
    req.current = null;
    setResult(null);
    setFailure(null);
  }, []);

  return { draft, reset, result, failure, pending: act.isPending, setResult };
}
