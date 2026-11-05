// Gửi action từ node GenUI (TIP-023c hợp đồng 4): chỉ khi server đã phát intent cho node (path → handle) — không có intent thì không có
// đường gọi (renderer ẩn nút). useAction mang handle → server tự đặt nguồn assistant → luôn xem trước / xác nhận như Trợ lý; ô bí mật đi
// vault ở lần xác nhận (không gửi lại giá trị, không vào store tin nhắn).
'use client';
import { useCallback } from 'react';
import { useAction, type RunOptions } from '../../actions/useAction';
import { useGenUi } from '../context';

export function useGenUiIntent(actionId: string, path: string) {
  const { intent } = useGenUi();
  const handle = intent(path);
  const action = useAction(actionId);
  const { run: runAction } = action;
  const run = useCallback(
    (input: Record<string, unknown>, opts: Omit<RunOptions, 'genui'> & { secretPaths?: string[] } = {}) => {
      if (!handle) return Promise.resolve(null);
      const { secretPaths, ...rest } = opts;
      return runAction(input, { ...rest, genui: { intent: handle, ...(secretPaths?.length ? { secretPaths } : {}) } });
    },
    [handle, runAction],
  );
  return { run, allowed: !!handle, isPending: action.isPending };
}
