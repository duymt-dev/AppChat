'use client';
import { Modal } from 'antd';
import { useTranslations } from 'next-intl';
import { useConfirmStore } from './confirm-store';

export function ConfirmActionHost() {
  const t = useTranslations();
  const pending = useConfirmStore((s) => s.pending);
  const settle = useConfirmStore((s) => s.settle);
  return (
    <Modal
      open={!!pending}
      title={t('actions.previewTitle')}
      okText={t('common.confirm')}
      cancelText={t('common.cancel')}
      onOk={() => settle(true)}
      onCancel={() => settle(false)}
      destroyOnHidden
    >
      {pending?.preview.summary}
      {pending?.preview.warnings?.map((w) => <div key={w}>{w}</div>)}
    </Modal>
  );
}
