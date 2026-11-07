// Thẻ một yêu cầu duyệt (REQ-D07: Duyệt / Sửa / Từ chối). Sửa & duyệt: form các trường vô hướng của input action gốc (`fields` từ
// backend) → `approval.edit_and_approve` (server kiểm lại bằng schema action). Từ chối: hỏi lý do (tuỳ chọn) → `note`.
'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useApprovalStyles } from '../styles/approval.styles';
import type { ApprovalRow } from '../types';

const RISK_TONE: Record<string, [string, string]> = {
  send: [color.pink, color.roseBg],
  money: [color.amberText, color.amberBg],
};
type Mode = 'view' | 'edit' | 'reject';

/** Giá trị form (chuỗi) → kiểu của trường; ô trống của trường không bắt buộc → bỏ khỏi input. */
function toInput(fields: ApprovalRow['fields'], form: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = form[f.key] ?? '';
    if (f.type === 'boolean') out[f.key] = v === 'true';
    else if (v.trim() === '') continue;
    else out[f.key] = f.type === 'number' ? Number(v) : v;
  }
  return out;
}

export function ApprovalCard({ a }: { a: ApprovalRow }) {
  const t = useTranslations('assistant.ap');
  const tl = useTranslations('assistant.log');
  const { styles } = useApprovalStyles();
  const approve = useAction('approval.approve');
  const reject = useAction('approval.reject');
  const edit = useAction('approval.edit_and_approve');
  const [mode, setMode] = useState<Mode>('view');
  const [note, setNote] = useState('');
  const [form, setForm] = useState<Record<string, string>>(() => Object.fromEntries(a.fields.map((f) => [f.key, a.input[f.key] === undefined ? '' : String(a.input[f.key])])));
  const [fg, bg] = RISK_TONE[a.risk] ?? [color.text3, color.mutedBg];
  const busy = approve.isPending || reject.isPending || edit.isPending;
  const off = !a.can_decide || busy;

  return (
    <div className={styles.card} data-testid="ap-card" data-approval={a.id}>
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="ic-shield" size={17} color={color.violet} />
        </span>
        <div className={styles.grow}>
          <div className={styles.title}>{a.title}</div>
          <div className={styles.meta}>
            {t('by', { agent: a.agent })} · {tl('when', { day: tl(`day.${a.day}` as never), time: a.time })}
          </div>
        </div>
        <span className={styles.risk} style={{ color: fg, background: bg }}>
          {t(`risk.${a.risk}` as never)}
        </span>
      </div>
      <div className={styles.summary}>{a.summary}</div>
      <div className={styles.reason}>
        <b>{t('reason')}</b>: {a.reason}
      </div>
      {mode === 'edit' ? (
        <div className={styles.form} data-testid="ap-edit-form">
          <div className={styles.label}>{t('editTitle')}</div>
          {a.fields.length ? null : <div className={styles.meta}>{t('noFields')}</div>}
          {a.fields.map((f) => (
            <label key={f.key}>
              <div className={styles.label}>{f.key}</div>
              {f.type === 'boolean' ? (
                <select className={styles.input} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} data-field={f.key}>
                  <option value="true">✓</option>
                  <option value="false">—</option>
                </select>
              ) : (
                <input className={styles.input} type={f.type === 'number' ? 'number' : 'text'} value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} data-field={f.key} />
              )}
            </label>
          ))}
        </div>
      ) : null}
      {mode === 'reject' ? (
        <div className={styles.form}>
          <input className={styles.input} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('rejectReason')} aria-label={t('rejectReason')} maxLength={500} data-testid="ap-reject-note" />
        </div>
      ) : null}
      {a.status === 'pending' ? (
        <div className={styles.foot}>
          {a.can_decide ? null : <span className={styles.noRight}>{t('noRight')}</span>}
          <span className={styles.grow} />
          {mode === 'view' ? (
            <>
              <button type="button" className={styles.reject} disabled={off} onClick={() => setMode('reject')} data-testid="ap-reject">
                {t('reject')}
              </button>
              <button type="button" className={styles.reject} disabled={off} onClick={() => setMode('edit')} data-testid="ap-edit">
                {t('edit')}
              </button>
              <button type="button" className={styles.approve} disabled={off} onClick={() => void approve.run({ approval_id: a.id })} data-testid="ap-approve">
                <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
                {t('approve')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className={styles.reject} disabled={busy} onClick={() => setMode('view')}>
                {t('cancel')}
              </button>
              {mode === 'reject' ? (
                <button type="button" className={styles.approve} disabled={off} onClick={() => void reject.run({ approval_id: a.id, ...(note.trim() ? { note: note.trim() } : {}) })} data-testid="ap-reject-confirm">
                  {t('confirmReject')}
                </button>
              ) : (
                <button type="button" className={styles.approve} disabled={off} onClick={() => void edit.run({ approval_id: a.id, edited_input: toInput(a.fields, form) })} data-testid="ap-edit-save">
                  <Icon name="ic-check" size={13} color={color.white} strokeWidth={2.4} />
                  {t('saveApprove')}
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className={styles.foot}>
          <span className={styles.done}>{t(`status.${a.status}`)}</span>
          {a.note ? <span className={styles.meta}>{t('noteLabel', { note: a.note })}</span> : null}
        </div>
      )}
    </div>
  );
}
