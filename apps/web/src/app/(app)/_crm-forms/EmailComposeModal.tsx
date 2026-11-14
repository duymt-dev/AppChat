// Modal "Gửi email" dùng chung — prototype L760–776: Gửi từ · Đến · Mẫu email (3 mẫu) · Tiêu đề · Nội dung.
// Mở từ Hồ sơ 360° (REQ-F11, nút "Gửi email") qua useEmailComposeUi — không gắn hội thoại (contact.send_email).
'use client';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useEmailComposeStyles } from '@/shared/crm-forms/email-compose.styles';
import { useEmailComposeUi } from '@/shared/crm-forms/email-compose-store';
import { accountsQuery, contactQuery } from '@/features/inbox/api';

const TPL_KEYS = ['followUp', 'resendQuote', 'confirmBooking'] as const;
/** Tên tài khoản kênh email có dạng "Email · địa chỉ" (fixtures/prototype-parity/inbox.json) — tách lấy địa chỉ. */
const emailOf = (accountName: string) => accountName.replace(/^.*·\s*/, '').trim();

export function EmailComposeModal() {
  const ui = useEmailComposeUi();
  if (!ui.target) return null;
  return <EmailComposeForm contactId={ui.target.contactId} to={ui.target.to} />;
}

function EmailComposeForm({ contactId, to }: { contactId: string; to: string }) {
  const t = useTranslations('inbox.p360.email');
  const { styles, cx } = useEmailComposeStyles();
  const close = useEmailComposeUi((s) => s.close);
  const contact = useQuery(contactQuery(contactId)).data;
  const accounts = useQuery(accountsQuery()).data;
  const emailAccounts = useMemo(() => (accounts ?? []).filter((a) => a.channel === 'email'), [accounts]);
  const send = useAction<{ ok: boolean }>('contact.send_email');
  const name = contact?.name ?? '';
  const [fromTouched, setFromTouched] = useState<string | null>(null);
  const from = fromTouched ?? emailAccounts[0]?.name ?? '';
  const [tpl, setTpl] = useState<(typeof TPL_KEYS)[number]>('followUp');
  const [subject, setSubject] = useState(t(`tpl.${TPL_KEYS[0]}.subject`));
  const [body, setBody] = useState(t(`tpl.${TPL_KEYS[0]}.body`, { name }));

  const pickTpl = (key: (typeof TPL_KEYS)[number]) => {
    setTpl(key);
    setSubject(t(`tpl.${key}.subject`));
    setBody(t(`tpl.${key}.body`, { name }));
  };

  const valid = !!from && !!to.trim() && !!subject.trim() && !!body.trim();
  const submit = async () => {
    if (!valid) return;
    const res = await send.run({ contact_id: contactId, from: emailOf(from), to: to.trim(), subject: subject.trim(), body: body.trim() });
    if (res) close();
  };

  return (
    <ModalShell
      open
      onClose={close}
      width={600}
      title={t('title')}
      icon="ic-mail"
      iconColor={color.info}
      iconBg={color.infoBg}
      closeLabel={t('close')}
      testId="email-compose"
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('cancel')}
          </button>
          <button
            type="button"
            className={cx(styles.btn, styles.primary)}
            disabled={!valid}
            onClick={() => void submit()}
            data-testid="email-send"
          >
            {t('send')}
          </button>
        </>
      }
    >
      <div className={styles.field}>
        <label className={styles.label}>{t('from')}</label>
        <select className={styles.input} value={from} onChange={(e) => setFromTouched(e.target.value)} data-testid="email-from">
          {emailAccounts.map((a) => (
            <option key={a.id} value={a.name}>
              {emailOf(a.name)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>{t('to')}</label>
        <input className={styles.input} value={to} disabled data-testid="email-to" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>{t('template')}</label>
        <select className={styles.input} value={tpl} onChange={(e) => pickTpl(e.target.value as (typeof TPL_KEYS)[number])} data-testid="email-tpl">
          {TPL_KEYS.map((k) => (
            <option key={k} value={k}>
              {t(`tpl.${k}.label`)}
            </option>
          ))}
        </select>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>{t('subject')}</label>
        <input className={styles.input} value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="email-subject" />
      </div>
      <div className={styles.field}>
        <label className={styles.label}>{t('body')}</label>
        <textarea className={cx(styles.input, styles.body)} value={body} onChange={(e) => setBody(e.target.value)} data-testid="email-body" />
      </div>
    </ModalShell>
  );
}
