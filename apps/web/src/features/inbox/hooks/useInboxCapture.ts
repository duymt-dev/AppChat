// Ảnh chụp màn hình chờ xác nhận của ô soạn (TIP-025b §F.4): chụp → xem trước (URL blob cục bộ) → Chấp nhận mới đưa vào tệp chờ gửi
// (useComposerFiles — quét / hạn mức / tải lên 045b), gửi vẫn là nút Gửi. Huỷ / từ chối / không hỗ trợ → gợi ý đính kèm tệp thường.
// Giải phóng URL blob khi bỏ, khi đổi hội thoại và khi unmount.
'use client';
import { useEffect, useRef, useState } from 'react';
import { captureScreenFrame } from '@/shared/media/screen-capture';

export type CaptureState = { kind: 'idle' } | { kind: 'busy' } | { kind: 'preview'; blob: Blob; url: string } | { kind: 'error'; reason: 'unsupported' | 'denied' | 'failed' };

export function useInboxCapture(conversationId: string, accept: (files: File[]) => void) {
  const [s, setS] = useState<CaptureState>({ kind: 'idle' });
  const url = useRef<string | null>(null);
  const drop = () => {
    if (url.current) URL.revokeObjectURL(url.current);
    url.current = null;
  };
  const reset = () => (drop(), setS({ kind: 'idle' }));
  useEffect(() => reset, [conversationId]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    state: s,
    start: async () => {
      reset();
      setS({ kind: 'busy' });
      const r = await captureScreenFrame();
      if (!r.ok) return setS({ kind: 'error', reason: r.reason });
      url.current = URL.createObjectURL(r.blob);
      setS({ kind: 'preview', blob: r.blob, url: url.current });
    },
    accept: () => {
      if (s.kind !== 'preview') return;
      accept([new File([s.blob], `screenshot-${Date.now()}.png`, { type: 'image/png' })]);
      reset();
    },
    cancel: reset,
  };
}
