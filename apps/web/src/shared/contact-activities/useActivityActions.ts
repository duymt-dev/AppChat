// Thao tác nhanh trên thẻ (TIP-026b §3.4): đánh dấu việc xong / mở lại (gửi if_version của bản đang hiển thị; lệch → 409 → thông báo
// "đã có người sửa" + làm mới, không giả trạng thái), gửi bình luận nhanh. Nút bị khoá khi đang chạy; không đổi giao diện trước khi server xác nhận.
'use client';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import type { ApiRequestError, TaskItemDto } from '@appchat/shared';
import { useAction } from '../actions/useAction';

export function useActivityActions(contactId: string) {
  const t = useTranslations('common.activities');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const setState = useAction('contact_task.set_state');
  const comment = useAction('contact.add_comment');
  const [pendingTask, setPendingTask] = useState<string | null>(null);
  const stale = (e: ApiRequestError) => {
    if (e.error.code !== 'STALE_VERSION') return false;
    message.warning(t('stale'));
    void qc.invalidateQueries({ queryKey: ['crm'] });
    return true;
  };
  return {
    pendingTask,
    toggleTask: async (task: TaskItemDto) => {
      setPendingTask(task.id);
      try {
        await setState.run({ task_id: task.id, if_version: task.version, state: task.state === 'done' ? 'open' : 'done' }, { onError: stale });
      } finally {
        setPendingTask(null);
      }
    },
    commenting: comment.isPending,
    addComment: async (body: string) => !!(await comment.run({ contact_id: contactId, body: body.trim() })),
    stale,
  };
}
