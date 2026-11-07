// Chuyển quyền Chủ sở hữu (TIP-045b annex A3, rbac §7) — Cài đặt › Thành viên, chỉ Owner (Can `workspace.transfer_ownership`). Bước 1:
// chọn thành viên active + đọc hậu quả (bạn thành Quản lý, không hoàn tác — đổi lại cần người kia chuyển bằng mã mới) → gửi mã email.
// Bước 2: nhập mã 6 số + gõ lại tên người nhận để xác nhận thật → `workspace.transfer_ownership`. Lỗi mã giữ trên form (không đóng hộp).
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { ApiRequestError, TransferOtpReason, TransferOtpSent } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useSettingsUi } from '../settings-store';
import type { Member } from '../types';
import { FormModal } from './FormModal';

const OTP = /^\d{6}$/;

export function OwnershipTransferModal({ members }: { members: Member[] }) {
  const t = useTranslations('settings.members.transfer');
  const s = useSectionStyles().styles;
  const open = useSettingsUi((x) => x.transferOpen);
  const set = useSettingsUi((x) => x.set);
  const request = useAction<TransferOtpSent>('workspace.request_transfer_otp');
  const transfer = useAction('workspace.transfer_ownership');
  const [to, setTo] = useState('');
  const [sent, setSent] = useState<TransferOtpSent | null>(null);
  const [otp, setOtp] = useState('');
  const [typed, setTyped] = useState('');
  const [err, setErr] = useState<string | null>(null);
  if (!open) return null;
  const candidates = members.filter((m) => m.role !== 'owner' && !m.invite && m.status !== 'pending');
  const target = candidates.find((m) => m.id === to);
  const close = () => {
    setTo('');
    setSent(null);
    setOtp('');
    setTyped('');
    setErr(null);
    set({ transferOpen: false });
  };
  const onOtpError = (e: ApiRequestError) => {
    if (e.error.code !== 'OTP_INVALID') return false;
    setErr(t(`err.${(e.error.fields?.otp ?? 'invalid') as TransferOtpReason}`));
    return true;
  };
  const save = async () => {
    setErr(null);
    if (!target) return setErr(t('err.pick'));
    if (!sent) {
      const r = await request.run({ to_user_id: target.id }, { silent: true });
      if (r) setSent(r.result);
      return;
    }
    if (!OTP.test(otp)) return setErr(t('err.format'));
    if (typed.trim() !== target.name.trim()) return setErr(t('err.confirm'));
    const r = await transfer.run({ to_user_id: target.id, otp }, { onError: onOtpError });
    if (r) close();
  };
  return (
    <FormModal
      open
      title={t('title')}
      onClose={close}
      onSave={() => void save()}
      saveLabel={sent ? t('confirm') : t('send')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={request.isPending || transfer.isPending}
      testId="st-transfer-modal"
    >
      <div>
        <div className={s.label}>{t('to')}</div>
        <select
          className={s.select}
          value={to}
          disabled={!!sent}
          onChange={(e) => {
            setTo(e.target.value);
            setErr(null);
          }}
          data-testid="st-transfer-to"
        >
          <option value="">{t('pick')}</option>
          {candidates.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} · {m.email}
            </option>
          ))}
        </select>
      </div>
      <div className={s.muted} data-testid="st-transfer-consequence">
        {t('consequence', { name: target?.name ?? t('them') })}
      </div>
      {sent && target ? (
        <>
          <div className={s.muted}>{t('sent', { to: sent.sent_to })}</div>
          <div>
            <div className={s.label}>{t('otp')}</div>
            <input className={s.input} value={otp} inputMode="numeric" maxLength={6} autoComplete="one-time-code" onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} data-testid="st-transfer-otp" />
          </div>
          <div>
            <div className={s.label}>{t('typeName', { name: target.name })}</div>
            <input className={s.input} value={typed} onChange={(e) => setTyped(e.target.value)} data-testid="st-transfer-name" />
          </div>
        </>
      ) : null}
      {err ? (
        <div className={s.muted} role="alert" data-testid="st-transfer-error">
          {err}
        </div>
      ) : null}
    </FormModal>
  );
}
