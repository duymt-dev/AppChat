// Lệnh UI "nhập dữ liệu" (TIP-038b P4): Trợ lý / thẻ xác nhận phát `open` entity `transfer_plan` (uiTarget của transfer.plan /
// update_mapping / commit) → host đã đăng ký mở TransferPanel đúng kế hoạch. Shared chỉ phát sự kiện có kiểu — không import feature
// (ChatThread không mount panel trực tiếp). Kèm nhãn gợi ý cho tệp đính kèm CSV / XLSX ("Nhập dữ liệu từ tệp này").
'use client';
import { useCallback } from 'react';
import type { UiCommand } from '@appchat/actions';
import { registerAttachmentUi } from './attachment-extensions';
import { useUiCommand } from './ui-command-bus';

export const TRANSFER_PLAN_ENTITY = 'transfer_plan';
export const TRANSFER_MIMES = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'] as const;

registerAttachmentUi({ key: 'data.import', mimes: TRANSFER_MIMES, labelKey: 'assistant.attachments.dataImport' });

/** Host gọi: lệnh `open:transfer_plan` → `onOpen(planId)`. */
export function useTransferPlanCommand(onOpen: (planId: string) => void) {
  const handle = useCallback((cmd: UiCommand) => {
    if (cmd.type === 'open' && cmd.entity === TRANSFER_PLAN_ENTITY) onOpen(cmd.id);
  }, [onOpen]);
  useUiCommand(`open:${TRANSFER_PLAN_ENTITY}`, handle);
}
