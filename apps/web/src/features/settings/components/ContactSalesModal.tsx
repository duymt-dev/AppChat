// "Liên hệ" gói Doanh nghiệp (TIP-039 pha 3, AC08; prototype L985 nút Liên hệ) — form tên / email / SĐT / nhu cầu + đồng ý liên hệ →
// `billing.contact_sales` (billing.manage). Thành công = đội AppChat đã NHẬN yêu cầu (không phải đã ký). Lỗi kiểm tra / quá giới hạn hiện
// tại chỗ, không báo thành công giả. Người không có billing.manage: nút Liên hệ mở hộp nhắc liên hệ Chủ sở hữu (không gửi).
'use client';
import { useState } from 'react';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { ApiRequestError } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { useMe } from '@/shared/shell/useShellData';
import { useSectionStyles } from '../styles/section.styles';
import { useFieldModalStyles } from '../styles/field-modal.styles';
import { useContactSalesStyles } from '../styles/contact-sales.styles';
import { useBillingUi } from '../billing-store';
import { FormModal } from './FormModal';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[0-9 .-]{8,20}$/;
const FIELDS: { key: 'name' | 'email' | 'phone'; type: string }[] = [
  { key: 'name', type: 'text' },
  { key: 'email', type: 'email' },
  { key: 'phone', type: 'tel' },
];

export function ContactSalesModal() {
  const t = useTranslations('settings.billing.contact');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const { styles } = useFieldModalStyles();
  const c = useContactSalesStyles().styles;
  const open = useBillingUi((x) => x.contactOpen);
  const set = useBillingUi((x) => x.set);
  const canBuy = useCan('billing.manage');
  const me = useMe().data;
  const send = useAction('billing.contact_sales');
  const [d, setD] = useState({ name: '', email: '', phone: '', message: '', consent: false });
  const [err, setErr] = useState<string | null>(null);
  if (!open) return null;
  const close = () => {
    set({ contactOpen: false });
    setErr(null);
  };
  const patch = (p: Partial<typeof d>) => setD({ ...d, ...p });
  const name = d.name || me?.user?.name || '';
  const email = d.email || me?.user?.email || '';
  const submit = async () => {
    const body = { name: name.trim(), email: email.trim(), phone: d.phone.trim(), message: d.message.trim(), consent: d.consent };
    if (body.name.length < 2) return setErr(t('errName'));
    if (!EMAIL.test(body.email)) return setErr(t('errEmail'));
    if (!PHONE.test(body.phone)) return setErr(t('errPhone'));
    if (body.message.length < 5) return setErr(t('errMessage'));
    if (!body.consent) return setErr(t('errConsent'));
    setErr(null);
    const r = await send.run(body, {
      silent: true,
      onError: (e: ApiRequestError) => (setErr(e.error.code === 'RATE_LIMITED' ? t('errLimit') : t('errSend')), true),
    });
    if (r) {
      message.success(t('received'));
      close();
    }
  };
  if (!canBuy)
    return (
      <FormModal open title={t('title')} onClose={close} onSave={close} saveLabel={t('ok')} cancelLabel={t('cancel')} closeLabel={t('close')} testId="contact-sales-modal">
        <p className={c.sub} data-testid="contact-sales-ask-owner">{t('askOwner')}</p>
      </FormModal>
    );
  return (
    <FormModal
      open
      title={t('title')}
      onClose={close}
      onSave={() => void submit()}
      saveLabel={t('send')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={send.isPending}
      testId="contact-sales-modal"
    >
      <p className={c.sub}>{t('sub')}</p>
      {FIELDS.map(({ key, type }) => (
        <div key={key}>
          <div className={s.label}>{t(key)}</div>
          <input className={styles.input} type={type} value={{ name, email, phone: d.phone }[key]} onChange={(e) => patch({ [key]: e.target.value })} data-testid={`contact-${key}`} />
        </div>
      ))}
      <div>
        <div className={s.label}>{t('message')}</div>
        <textarea className={c.area} rows={4} value={d.message} placeholder={t('messagePh')} onChange={(e) => patch({ message: e.target.value })} data-testid="contact-message" />
      </div>
      <label className={c.consent}>
        <input type="checkbox" checked={d.consent} onChange={(e) => patch({ consent: e.target.checked })} data-testid="contact-consent" /> {t('consent')}
      </label>
      {err ? (
        <div role="alert" className={c.err} data-testid="contact-error">
          {err}
        </div>
      ) : null}
    </FormModal>
  );
}
