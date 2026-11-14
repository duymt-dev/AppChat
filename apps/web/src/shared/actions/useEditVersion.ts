// Phiên bản khi sửa bản ghi (TIP-032c §4.1 — đơn / hợp đồng dùng chung): chốt `version` của bản ghi lúc MỞ form (refetch nền không đổi số
// này — không lấy bản mới rồi gửi lại mù), gửi kèm `if_version`; 409 STALE_VERSION → bật xung đột, GIỮ nguyên nội dung đang nhập; "Tải lại"
// = người dùng chủ động: làm mới truy vấn bản ghi rồi `onReloaded` (người gọi mở lại form với bản mới), không tự lưu lại.
'use client';
import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ApiRequestError } from '@appchat/shared';

export function useEditVersion(opened: number | undefined, queryKey: readonly unknown[], onReloaded?: () => void) {
  const qc = useQueryClient();
  const [base] = useState(opened);
  const [conflict, setConflict] = useState(false);
  /** onError cho useAction.run: 409 STALE_VERSION → xung đột (tự hiển thị, bỏ toast chung). */
  const onError = useCallback((e: ApiRequestError) => {
    if (e.error.code !== 'STALE_VERSION') return false;
    setConflict(true);
    return true;
  }, []);
  const reload = useCallback(async () => {
    await qc.invalidateQueries({ queryKey });
    setConflict(false);
    onReloaded?.();
  }, [qc, queryKey, onReloaded]);
  return { ifVersion: base, conflict, onError, reload };
}
