// Đọc + tạo đơn từ thẻ gợi ý (TIP-033c §2.1, §2.4): đọc qua action `appointment.order_suggestions` (phép chiếu hiện hành phía server — tải lại /
// kết nối lại vẫn còn), tạo qua `order.create_from_appointment` (xem trước bắt buộc → hộp xác nhận chung → biên nhận). Kết quả muộn gắn
// đúng nguồn + lịch + revision lúc bấm (không hiện ở nguồn khác). 409 (giá / lịch đổi, đã có đơn ngoài quyền) → trạng thái "đã đổi" + đọc lại,
// không tự bấm lại. Hoàn thành lịch / hiển thị thẻ không tạo gì.
'use client';
import { useCallback, useState } from 'react';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { ApiRequestError } from '@appchat/shared';
import { transport } from '../api/client';
import { useAction } from '../actions/useAction';
import type { CardState, OrderSuggestion, OrderSuggestionPage, OrderSuggestionSource } from './types';

/** Khoá cache bắt đầu bằng `calendar` — action tạo đơn invalidates ['orders','calendar'] làm mới thẻ ở mọi nơi. */
export const suggestionKey = (src: OrderSuggestionSource) => ['calendar', 'order-suggestions', 'appointmentId' in src ? `a:${src.appointmentId}` : `c:${src.conversationId}`] as const;

async function page(src: OrderSuggestionSource, cursor: string): Promise<OrderSuggestionPage> {
  const input = 'appointmentId' in src ? { appointment_id: src.appointmentId } : { conversation_id: src.conversationId, limit: 10, ...(cursor ? { cursor } : {}) };
  const r = await transport.action<OrderSuggestionPage>('appointment.order_suggestions', input);
  return r.status === 200 ? r.data.result : { data: [], next_cursor: null };
}

export function useAppointmentOrder(src: OrderSuggestionSource | null) {
  const qc = useQueryClient();
  const create = useAction<{ order_id: string; code: string; reused?: boolean }>('order.create_from_appointment');
  const srcKey = src ? suggestionKey(src).join('|') : '';
  // Trạng thái thẻ gắn nguồn lúc bấm: chỉ hiện trạng thái của nguồn đang mở — đổi lịch / hội thoại không mang trạng thái cũ sang, kết quả
  // muộn của nguồn cũ ghi vào nguồn cũ (không hiện ở nguồn mới).
  const [all, setAll] = useState<Record<string, CardState>>({});
  const states = Object.fromEntries(Object.entries(all).flatMap(([k, v]) => (k.startsWith(`${srcKey}#`) ? [[k.slice(srcKey.length + 1), v]] : [])));

  const q = useInfiniteQuery({
    queryKey: src ? suggestionKey(src) : ['calendar', 'order-suggestions', 'none'],
    queryFn: ({ pageParam }) => page(src!, pageParam),
    initialPageParam: '',
    getNextPageParam: (p) => p.next_cursor ?? undefined,
    enabled: !!src,
  });
  const cards: OrderSuggestion[] = q.data?.pages.flatMap((p) => p.data) ?? [];

  const confirm = useCallback(
    async (c: OrderSuggestion) => {
      const k = `${srcKey}#${c.appointment_id}@${c.revision}`;
      const set = (s: CardState) => setAll((m) => ({ ...m, [k]: s }));
      set({ kind: 'confirming' });
      const conflict = (e: ApiRequestError) => {
        if (e.status !== 409 && e.status !== 404) return false;
        set(e.status === 404 ? { kind: 'unavailable' } : { kind: 'changed' });
        void qc.invalidateQueries({ queryKey: ['calendar', 'order-suggestions'] });
        return true;
      };
      const r = await create.run({ appointment_id: c.appointment_id }, { onError: conflict });
      if (r) set({ kind: 'created', orderId: r.result.order_id, code: r.result.code, reused: r.result.reused === true });
      else setAll((m) => (m[k]?.kind === 'confirming' ? { ...m, [k]: { kind: 'idle' } } : m));
    },
    [create, qc, srcKey],
  );

  const stateOf = (c: OrderSuggestion): CardState => states[`${c.appointment_id}@${c.revision}`] ?? { kind: 'idle' };
  /** Thẻ đã tạo đơn vẫn hiện (biên nhận) dù phép chiếu không còn trả nó. */
  const receipts = Object.entries(states).flatMap(([k, s]) => (s.kind === 'created' && !cards.some((c) => `${c.appointment_id}@${c.revision}` === k) ? [{ key: k, state: s }] : []));
  return { cards, receipts, stateOf, confirm, isLoading: q.isLoading, isError: q.isError, refetch: q.refetch, more: q.hasNextPage ? () => void q.fetchNextPage() : null };
}
