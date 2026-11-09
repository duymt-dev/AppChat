// Phiên bản khi sửa đơn (TIP-032c §4.1): giữ `version` của đơn đã mở, 409 → xung đột giữ nội dung đang nhập (shared/actions/useEditVersion).
'use client';
import { useEditVersion } from '@/shared/actions/useEditVersion';

export const useOrderEditVersion = (id: string, version: number | undefined, onReloaded?: () => void) =>
  useEditVersion(version, ['orders', 'one', id], onReloaded);
