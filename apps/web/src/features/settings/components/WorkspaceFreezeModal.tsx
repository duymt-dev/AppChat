// Yêu cầu đóng băng workspace (TIP-041 P3, DC-245) — chỉ Owner. Owner KHÔNG tự tạm dừng: gửi lý do → `workspace.freeze_request`, admin nền
// tảng duyệt (tạm dừng theo luật TIP-040) hoặc từ chối. Trạng thái yêu cầu mới nhất đọc từ GET /workspace/lifecycle (`freeze_request`);
// đang chờ → chỉ hiện trạng thái, không gửi trùng (server cũng chặn — một yêu cầu chờ mỗi workspace).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useDangerStyles } from '../styles/danger.styles';
import { workspaceLifecycleQuery } from '../api';
import { FormModal } from './FormModal';

export function WorkspaceFreezeModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('settings.general.freeze');
  const fmt = useFmt();
  const s = useSectionStyles().styles;
  const { styles } = useDangerStyles();
  const q = useQuery(workspaceLifecycleQuery());
  const send = useAction('workspace.freeze_request');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const fr = q.data?.freeze_request ?? null;
  const pending = fr?.status === 'pending';
  const save = async () => {
    setErr(null);
    if (pending) return onClose();
    if (reason.trim().length < 3) return setErr(t('err.short'));
    const r = await send.run({ reason: reason.trim() });
    if (r) onClose();
  };
  return (
    <FormModal
      open
      title={t('title')}
      onClose={onClose}
      onSave={() => void save()}
      saveLabel={pending ? t('close') : t('send')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={send.isPending}
      testId="st-freeze-modal"
    >
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        <div className={s.muted}>{t('hint')}</div>
        {fr ? (
          <div className={styles.status} data-testid="st-freeze-status" data-status={fr.status}>
            {t(`status.${fr.status}`, { at: fmt.date(fr.decided_at ?? fr.created_at) })}
          </div>
        ) : null}
        {pending ? null : (
          <div>
            <div className={s.label}>{t('reason')}</div>
            <textarea
              className={s.input}
              rows={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('reasonPh')}
              aria-label={t('reason')}
              data-testid="st-freeze-reason"
            />
          </div>
        )}
        {err ? (
          <div className={styles.err} role="alert">
            {err}
          </div>
        ) : null}
      </PageStates>
    </FormModal>
  );
}
