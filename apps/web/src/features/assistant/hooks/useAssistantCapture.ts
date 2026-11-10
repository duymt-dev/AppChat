// Chụp màn hình cho Trợ lý (TIP-023f §4.3): chỉ khi người dùng bấm "Chụp ảnh màn hình" (mở menu ＋ không chụp) → helper dùng chung của
// 025b (một khung, mọi track dừng trong finally) → xem lại cục bộ → "Đính kèm" mới đưa vào khay (tải lên + chuẩn bị như tệp thường);
// gửi vẫn là nút Gửi. Từ chối / huỷ / không hỗ trợ → gợi ý chọn ảnh thủ công. Đổi workspace / phiên, unmount → bỏ ảnh, giải phóng URL.
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { captureScreenFrame } from '@/shared/media/screen-capture';
import type { CaptureState } from '../input-types';

export function useAssistantCapture(scope: string, attach: (files: File[]) => void) {
  const [state, setState] = useState<CaptureState>({ kind: 'idle' });
  const url = useRef<string | null>(null);
  const gen = useRef(0);
  const reset = useCallback(() => {
    gen.current++;
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
    setState({ kind: 'idle' });
  }, []);
  useEffect(() => reset, [scope, reset]);

  return {
    state,
    start: async () => {
      reset();
      const my = gen.current;
      setState({ kind: 'busy' });
      const r = await captureScreenFrame();
      if (gen.current !== my) return;
      if (!r.ok) return setState({ kind: 'error', reason: r.reason });
      url.current = URL.createObjectURL(r.blob);
      setState({ kind: 'review', blob: r.blob, url: url.current });
    },
    accept: () => {
      if (state.kind !== 'review') return;
      attach([new File([state.blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })]);
      reset();
    },
    cancel: reset,
  };
}
