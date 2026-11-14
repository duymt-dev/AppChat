// "Ghi đính chính" cho hành động đã gửi ra ngoài (REQ-E09c, TIP-003e §4): risk `send` không hoàn tác được — ghi thêm một mục đính chính
// vào nhật ký qua action `action_log.add_correction` (server kiểm quyền action gốc + scope bản ghi gốc). Không tự gửi tin cho khách.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useApprovalStyles } from '../styles/approval.styles';
import { useTaskFormStyles } from '../styles/task-form.styles';
import type { ActionLogRow } from '../types';

export function CorrectionModal({ row, onClose }: { row: ActionLogRow; onClose: () => void }) {
  const t = useTranslations('assistant.log.correct');
  const { styles } = useApprovalStyles();
  const { styles: f, cx } = useTaskFormStyles();
  const [note, setNote] = useState('');
  const add = useAction('action_log.add_correction');
  const save = async () => {
    if (await add.run({ action_log_id: row.id, note: note.trim() })) onClose();
  };
  return (
    <ModalShell
      open
      onClose={onClose}
      width={480}
      title={t('title')}
      icon="ic-edit"
      iconColor={color.brand}
      iconBg={color.brandBg}
      closeLabel={t('close')}
      testId="log-correct"
      footer={
        <>
          <button type="button" className={styles.reject} onClick={onClose}>
            {t('close')}
          </button>
          <button type="button" className={styles.approve} disabled={!note.trim() || add.isPending} onClick={() => void save()} data-testid="log-correct-save">
            {t('save')}
          </button>
        </>
      }
    >
      <div className={styles.meta}>{t('hint', { title: row.title ?? row.action_id })}</div>
      <label className={f.label} htmlFor="log-correct-note">
        {t('note')}
      </label>
      <textarea id="log-correct-note" className={cx(f.input, f.area)} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} data-testid="log-correct-note" />
    </ModalShell>
  );
}
