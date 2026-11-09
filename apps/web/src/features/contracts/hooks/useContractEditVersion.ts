// Phiên bản khi sửa hợp đồng nháp (TIP-032c §4.1): giữ `version` của hợp đồng đã mở, 409 → xung đột giữ nội dung đang nhập.
'use client';
import { useEditVersion } from '@/shared/actions/useEditVersion';

export const useContractEditVersion = (id: string, version: number | undefined, onReloaded?: () => void) =>
  useEditVersion(version, ['contracts', 'one', id], onReloaded);
