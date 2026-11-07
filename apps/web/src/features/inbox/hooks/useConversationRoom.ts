// Vào phòng `conv:{id}` của hội thoại đang mở (http — Socket.IO `/ws`) để nhận `message.new` / `message.updated`; rời khi đổi
// hội thoại / đóng màn. Mock không có socket (sự kiện mock phát toàn cục).
'use client';
import { useEffect } from 'react';
import { apiMode } from '@/shared/api/transport';
import { joinConversation } from '@/shared/realtime/socket';

export function useConversationRoom(id: string | undefined) {
  useEffect(() => {
    if (!id || apiMode() !== 'http') return;
    return joinConversation(id);
  }, [id]);
}
