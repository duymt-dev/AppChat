'use client';
// Hộp xác nhận 202 preview của useAction: tóm tắt + cảnh báo + bảng kiểm pháp lý của chứng từ (TIP-028b — gửi / duyệt báo giá, hợp đồng,
// đề nghị thanh toán). Bảng kiểm chỉ cảnh báo, nút xác nhận không khoá (DC-444).
import { Modal } from 'antd';
import { useTranslations } from 'next-intl';
import { z } from '@appchat/ui';
import { useConfirmStore } from './confirm-store';
import { ChecklistPanel } from './ChecklistPanel';

export function ConfirmActionHost() {
  const t = useTranslations();
  const pending = useConfirmStore((s) => s.pending);
  const settle = useConfirmStore((s) => s.settle);
  const checklist = pending?.preview.checklist;
  return (
    <Modal
      open={!!pending}
      title={t('actions.previewTitle')}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      onOk={() => settle(true)}
      onCancel={() => settle(false)}
      // Mở từ trong ModalShell (Duyệt & ký, Gửi ký — z.stackedModal) → phải nằm trên hộp đang mở.
      zIndex={z.modal}
      destroyOnHidden
    >
      {pending?.preview.summary}
      {pending?.preview.warnings?.map((w) => <div key={w}>{w}</div>)}
      {checklist?.length ? <ChecklistPanel items={checklist} /> : null}
    </Modal>
  );
}
