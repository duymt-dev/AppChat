// Realtime `ui.command` (TIP-006c, Blueprint §4.6): server chỉ gửi tới tab đã gửi lượt (phòng `tab:{user}:{tab}`) — tab này chạy lệnh qua
// UI Command Bus; không có handler → `navigate` theo route (lệnh khác không có màn đích thì bỏ qua). Lệnh đã chạy từ sự kiện lượt thì
// bỏ (claimUiCommand). Chế độ mock không có realtime — lệnh vẫn đi trong sự kiện lượt.
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { uiCommandSchema } from '@appchat/shared';
import { apiMode } from '../api/transport';
import { subscribeRealtime } from '../realtime/socket';
import { dispatchUiCommand } from './ui-command-bus';
import { claimUiCommand } from './ui-command-once';

export function useRealtimeUiCommands() {
  const router = useRouter();
  useEffect(() => {
    if (apiMode() === 'mock') return;
    return subscribeRealtime((event, data) => {
      if (event !== 'ui.command') return;
      const d = data as { run_id?: unknown; command?: unknown } | null;
      const cmd = uiCommandSchema.safeParse(d?.command);
      if (!cmd.success || !claimUiCommand('realtime', typeof d?.run_id === 'string' ? d.run_id : null, cmd.data)) return;
      if (!dispatchUiCommand(cmd.data) && cmd.data.type === 'navigate') router.push(cmd.data.route);
    });
  }, [router]);
}
