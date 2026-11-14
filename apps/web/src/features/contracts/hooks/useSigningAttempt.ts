// Lượt mở chủ định của trang ký công khai (TIP-030c §1.1, §5.1): POST open một lần mỗi token, tách khỏi GET xem (refetch không ghi).
// request_id ổn định của các POST khác: ../signing-api.ts.
'use client';
import { useEffect, useRef } from 'react';
import { transport } from '@/shared/api/client';
import type { SignView } from '../types';

/** Lượt mở chủ định: POST open đúng một lần mỗi (token) trong vòng đời trang — không lặp khi refetch / focus / StrictMode mount lại. */
const visited = new Map<string, string>();
export function useSignVisit(token: string, enabled: boolean, onView?: (v: SignView) => void) {
  const cb = useRef(onView);
  useEffect(() => {
    cb.current = onView;
  });
  useEffect(() => {
    if (!enabled || visited.has(token)) return;
    const id = crypto.randomUUID();
    visited.set(token, id);
    transport.post<SignView>(`/public/sign/${token}/open`, { request_id: id }).then(
      (v) => cb.current?.(v),
      () => undefined,
    );
  }, [token, enabled]);
}
