// Realtime event → invalidate cache (không giữ state server song song). Mock phát qua onMockEvent; http nghe Socket.IO `/ws`
// (socket.ts). Sự kiện hội thoại chỉ mang id → làm mới đúng luồng tin + danh sách + đếm (Blueprint §4.6).
'use client';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiMode } from '../api/transport';
import { onMockEvent } from '../api/mock/store';
import { qk } from '../api/query-keys';
import { subscribeRealtime } from './socket';

type Key = readonly unknown[];
const INBOX_LIST: Key = ['inbox', 'conversations'];
const INBOX_COUNTS: Key = ['inbox', 'counts'];

const EVENT_KEYS: Record<string, readonly Key[]> = {
  // đổi vai trò = đổi quyền + data scope → mọi danh sách phải tải lại
  'authz.changed': [[]],
  'notification.new': [qk.notifications(), qk.navBadges()],
  // khách ký / từ chối trên trang công khai (Blueprint §4.5 contract.signed / contract.declined)
  'contract.signed': [['contracts']],
  'contract.declined': [['contracts']],
  // hàng chờ duyệt / nhật ký (TIP-021, 024) + agent (TIP-021)
  'approval.changed': [['approvals'], ['action-logs'], qk.navBadges()],
  'agent.changed': [['agents']],
  'channel.status': [['channels']],
  'kb.source': [['kb']],
  // sự kiện run đã commit (TIP-019b — chỉ id + seq + trạng thái, người còn đọc được run) → khung điều phối + drawer chi tiết tải lại
  'run.step': [['runs']],
  'run.done': [['runs']],
  // nối lại WS sau khi rớt → khung điều phối / drawer run đọc lại (sự kiện lỡ không phát lại)
  'realtime.reconnected': [['runs'], qk.navBadges()],
  // chiến dịch đổi trạng thái / gửi xong lô (TIP-037 — chỉ id + trạng thái, người có campaign.view)
  'campaign.updated': [['marketing']],
  // đổi định nghĩa / vai trò được thấy của trường tuỳ biến (TIP-045b annex C) → mọi danh sách + chi tiết tải lại (REST chiếu theo quyền)
  'fields.changed': [[]],
  // kết nối / lỗi gọi ra ngoài (TIP-012b P3 — chỉ id + mã lỗi đã làm sạch) → thẻ + drawer chi tiết kết nối tải lại
  'integration.connected': [['integrations']],
  'integration.disconnected': [['integrations']],
  'integration.error': [['integrations']],
  // vòng đời khách (TIP-015f — chỉ id + thế hệ) → danh sách / thùng rác / 360 + Hộp thư (dấu khách đã xoá / panel) đọc lại
  'contact.lifecycle': [['crm'], INBOX_LIST, ['inbox', 'conversation']],
  // cấu hình lịch hẹn đổi (TIP-033b — chỉ phạm vi + version) → Cài đặt Lịch hẹn + lịch / slot đọc lại
  'booking.config': [['settings', 'booking'], ['calendar']],
  // PDF chứng từ phát hành render xong / lỗi (TIP-028b — chỉ loại + id + trạng thái) → danh sách + chi tiết báo giá đọc lại
  'document.render': [['quotes']],
  // bộ gợi ý danh mục ticket đổi (TIP-034b — chỉ key + version, hai gói theo quyền) → Cài đặt đọc lại cấu hình; form / bộ lọc ticket đọc lại gợi ý
  'ticket_categories.config': [['settings', 'ticket-categories']],
  'ticket_categories.suggestions': [['tickets', 'meta'], ['tickets', 'category-suggestions']],
};

/** Khoá cần làm mới của một sự kiện (sự kiện hội thoại → theo `conversation_id`). */
export function keysFor(event: string, data: unknown): readonly Key[] {
  const id = (data as { conversation_id?: string } | null)?.conversation_id;
  if (event === 'message.new' || event === 'message.updated' || event === 'conversation.updated') {
    return [INBOX_LIST, INBOX_COUNTS, ...(id ? [['inbox', 'messages', id], ['inbox', 'conversation', id]] : []), qk.navBadges()];
  }
  return EVENT_KEYS[event] ?? [];
}

/**
 * TIP-006b §3.6: server publish at-least-once — gói tin mang `rt_id` ổn định thì bỏ bản trùng (nhớ tối đa 500 id gần nhất). Không có id →
 * luôn xử lý (làm mới thừa vô hại: dữ liệu thật đọc lại REST có quyền). Thứ tự lệch không quan trọng vì chỉ invalidate, không áp payload.
 */
export function dedupe(limit = 500) {
  const seen = new Set<string>();
  return (data: unknown): boolean => {
    const id = (data as { rt_id?: unknown } | null)?.rt_id;
    if (typeof id !== 'string') return true;
    if (seen.has(id)) return false;
    seen.add(id);
    if (seen.size > limit) seen.delete(seen.values().next().value as string);
    return true;
  };
}

export function useEventInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    const fresh = dedupe();
    const on = (event: string, data?: unknown) => {
      if (!fresh(data)) return;
      for (const key of keysFor(event, data)) void qc.invalidateQueries({ queryKey: key });
    };
    const off = apiMode() === 'mock' ? onMockEvent((event) => on(event)) : subscribeRealtime(on);
    return () => {
      off();
    };
  }, [qc]);
}
