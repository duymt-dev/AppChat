// Xoá workspace (TIP-041 P3, DC-245, DC-376) — chỉ Owner. Bước 1: đọc bản xem trước (GET /workspace/delete-preview: thành viên mất truy
// cập, gói còn lại + Credit mua thêm sẽ mất — không hoàn tiền tự động, sao lưu mã hoá giữ 30 ngày, dữ liệu giữ lại) + gõ lại tên + tick
// "đã hiểu" → `workspace.delete_challenge` gửi mã email (hạn 5 phút). Bước 2: nhập mã → `workspace.delete`. Mã hết hạn / khoá / bản xem
// trước đổi → báo trên form, xin mã mới. Xong → phiên làm mới (workspace chuyển `deleting`, cổng phiên hiện thẻ đang xoá).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { ApiRequestError } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useFmt } from '@/shared/i18n/useFmt';
import { PageStates, stateOf } from '@/shared/states/PageStates';
import { useSectionStyles } from '../styles/section.styles';
import { useDangerStyles } from '../styles/danger.styles';
import { deletePreviewQuery } from '../api';
import { FormModal } from './FormModal';

type Sent = { challenge_id: string; sent_to: string; expires_at: string };
const OTP = /^\d{6}$/;
const OTP_REASONS = ['invalid', 'expired', 'locked', 'stale'] as const;

export function WorkspaceDeleteModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations('settings.general.del');
  const fmt = useFmt();
  const s = useSectionStyles().styles;
  const { styles } = useDangerStyles();
  const q = useQuery(deletePreviewQuery());
  const challenge = useAction<Sent>('workspace.delete_challenge');
  const del = useAction('workspace.delete');
  const [typed, setTyped] = useState('');
  const [ack, setAck] = useState(false);
  const [sent, setSent] = useState<Sent | null>(null);
  const [otp, setOtp] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const p = q.data;
  const same = !!p && typed.trim().toLocaleLowerCase('vi') === p.name.trim().toLocaleLowerCase('vi');

  const onErr = (e: ApiRequestError) => {
    const f = e.error.fields ?? {};
    if (e.error.code === 'OTP_INVALID') {
      const why = (OTP_REASONS as readonly string[]).includes(f.otp ?? '') ? f.otp! : 'invalid';
      if (why !== 'invalid') setSent(null);
      setErr(t(`err.${why}` as never));
      return true;
    }
    if (e.error.code === 'RATE_LIMITED') return setErr(t('err.rate')), true;
    if (f.confirm_name === 'mismatch') return setErr(t('err.name')), true;
    if (f.email === 'unverified') return setErr(t('err.email')), true;
    return false;
  };

  const save = async () => {
    setErr(null);
    if (!p) return;
    if (!sent) {
      if (!same) return setErr(t('err.name'));
      if (!ack) return setErr(t('err.ack'));
      const r = await challenge.run({ confirm_name: typed.trim() }, { silent: true, onError: onErr });
      if (r) setSent(r.result);
      return;
    }
    if (!OTP.test(otp)) return setErr(t('err.format'));
    const r = await del.run({ challenge_id: sent.challenge_id, otp, acknowledge_loss: true }, { onError: onErr });
    if (r) onClose();
  };

  return (
    <FormModal
      open
      wide
      title={t('title')}
      onClose={onClose}
      onSave={() => void save()}
      saveLabel={sent ? t('confirm') : t('send')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={challenge.isPending || del.isPending}
      testId="st-del-modal"
    >
      <PageStates state={stateOf(q)} onRetry={() => void q.refetch()}>
        {p ? (
          <>
            <ul className={styles.list} data-testid="st-del-preview">
              <li>{t('members', { n: p.members })}</li>
              <li data-testid="st-del-plan">{p.paid_days_left !== null ? t('paid', { plan: p.plan_name ?? '', n: p.paid_days_left }) : t('noPaid')}</li>
              <li data-testid="st-del-credits">{t('credits', { n: fmt.number(p.topup_credits) })}</li>
              <li>{t('noRefund')}</li>
              <li>{t('backup', { n: p.backup_retention_days })}</li>
              <li>{t('retained')}</li>
            </ul>
            <div>
              <div className={s.label}>{t('typeName', { name: p.name })}</div>
              <input className={s.input} value={typed} disabled={!!sent} onChange={(e) => setTyped(e.target.value)} aria-label={t('typeName', { name: p.name })} data-testid="st-del-name" />
            </div>
            <label className={styles.ack}>
              <input type="checkbox" checked={ack} disabled={!!sent} onChange={(e) => setAck(e.target.checked)} data-testid="st-del-ack" />
              <span>{t('ack')}</span>
            </label>
            {sent ? (
              <>
                <div className={s.muted}>{t('sent', { to: sent.sent_to })}</div>
                <div>
                  <div className={s.label}>{t('otp')}</div>
                  <input
                    className={s.input}
                    value={otp}
                    inputMode="numeric"
                    maxLength={6}
                    autoComplete="one-time-code"
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                    aria-label={t('otp')}
                    data-testid="st-del-otp"
                  />
                </div>
              </>
            ) : null}
            {err ? (
              <div className={styles.err} role="alert" data-testid="st-del-error">
                {err}
              </div>
            ) : null}
          </>
        ) : null}
      </PageStates>
    </FormModal>
  );
}
