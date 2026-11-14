// Host TransferPanel (TIP-038b P4): một panel cho cả vùng (app) — mở bằng store (nút "Nhập" của màn) hoặc lệnh UI `open:transfer_plan`
// của Trợ lý (đúng kế hoạch vừa lập / vừa ghi) hoặc liên kết sâu `?transfer=<thực thể>` (mobile không có nút Nhập trên header). Route
// group chỉ ghép, logic ở features/data-transfer.
'use client';
import { useCallback, useEffect } from 'react';
import { TransferPanel, isTransferEntity, openTransfer, useTransferUi } from '@/features/data-transfer';
import { useTransferPlanCommand } from '@/shared/assistant/data-transfer-command';

export function TransferHost() {
  const open = useTransferUi((s) => s.open);
  useTransferPlanCommand(useCallback((planId: string) => openTransfer({ planId }), []));
  useEffect(() => {
    const e = new URLSearchParams(window.location.search).get('transfer');
    if (e && isTransferEntity(e)) openTransfer({ entity: e });
  }, []);
  return open ? <TransferPanel /> : null;
}
