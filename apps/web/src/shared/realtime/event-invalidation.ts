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
  // chiến dịch đổi trạng thái / gửi xong lô (TIP-037 — chỉ id + trạng thái, người có campaign.view)
  'campaign.updated': [['marketing']],
  // đổi định nghĩa / vai trò được thấy của trường tuỳ biến (TIP-045b annex C) → mọi danh sách + chi tiết tải lại (REST chiếu theo quyền)
  'fields.changed': [[]],
};

/** Khoá cần làm mới của một sự kiện (sự kiện hội thoại → theo `conversation_id`). */
export function keysFor(event: string, data: unknown): readonly Key[] {
  const id = (data as { conversation_id?: string } | null)?.conversation_id;
  if (event === 'message.new' || event === 'message.updated' || event === 'conversation.updated') {
    return [INBOX_LIST, INBOX_COUNTS, ...(id ? [['inbox', 'messages', id], ['inbox', 'conversation', id]] : []), qk.navBadges()];
  }
  return EVENT_KEYS[event] ?? [];
}

export function useEventInvalidation() {
  const qc = useQueryClient();
  useEffect(() => {
    const on = (event: string, data?: unknown) => {
      for (const key of keysFor(event, data)) void qc.invalidateQueries({ queryKey: key });
    };
    const off = apiMode() === 'mock' ? onMockEvent((event) => on(event)) : subscribeRealtime(on);
    return () => {
      off();
    };
  }, [qc]);
}
