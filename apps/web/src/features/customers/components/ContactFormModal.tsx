// Modal "Cập nhật khách hàng" (prototype L2600–2625, 560px) và "Tạo khách hàng" (L5189–5228, 720px, 3 nhóm trường).
// Tạo trùng với khách đã có người phụ trách → CONTACT_OWNED: hiện "Đã có người phụ trách" + "Xin chia sẻ" (D32), không lộ dữ liệu khách.
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { CustomFieldInputs, useCustomDraft } from '@/shared/custom-fields';
import { useFormStyles } from '../styles/form.styles';
import { useCrmUi } from '../crm-store';
import { membersQuery } from '../api';
import type { ContactRow } from '../types';

type Draft = Record<string, string>;
type Spec = [key: string, kind: 'text' | 'email' | 'tel' | 'date' | 'pick' | 'member' | 'area', required?: boolean, options?: string[]];

const EDIT: Spec[] = [['full_name', 'text'], ['title', 'text'], ['owner_user_id', 'member'], ['email', 'email'], ['phone', 'tel'], ['zalo', 'text'], ['city', 'text'], ['district', 'text']];
const EDIT_LABEL: Record<string, string> = { full_name: 'name', title: 'role', owner_user_id: 'owner', email: 'email', phone: 'phone', zalo: 'zalo', city: 'city', district: 'district' };
const CREATE: [section: string, fields: Spec[]][] = [
  ['basic', [['code', 'text'], ['full_name', 'text', true], ['type', 'pick', false, ['individual', 'business', 'household']], ['group', 'pick', false, ['vip', 'loyal', 'new', 'potential']], ['birthday', 'date'], ['gender', 'pick', false, ['male', 'female', 'other']]]],
  ['contact', [['phone', 'tel', true], ['email', 'email'], ['zalo', 'text'], ['address', 'text'], ['city', 'text'], ['district', 'text']]],
  ['manage', [['source', 'pick', false, ['zalo_personal', 'email', 'website', 'referral', 'manual']], ['owner_user_id', 'member'], ['status', 'pick', false, ['active', 'potential', 'inactive']], ['created', 'date'], ['note', 'area']]],
];
const CREATE_LABEL: Record<string, string> = { full_name: 'name', owner_user_id: 'owner' };
const OPT_NS: Record<string, string> = { type: 'type', group: 'group', gender: 'form.genders', source: 'source', status: 'status' };

export function ContactFormModal({ mode, contact }: { mode: 'create' | 'edit'; contact?: ContactRow }) {
  const t = useTranslations('customers');
  const { styles, cx } = useFormStyles();
  const ui = useCrmUi();
  const members = useQuery(membersQuery()).data ?? [];
  const create = useAction<{ contact_id: string }>('contact.create');
  const update = useAction('contact.update');
  const request = useAction('contact.request_access');
  const [d, setD] = useState<Draft>((): Draft => ({
    ...(contact ? { full_name: contact.full_name, title: contact.title, owner_user_id: contact.owner_user_id, email: contact.email, phone: contact.phone, zalo: contact.zalo, city: contact.city, district: contact.district } : {}),
    ...ui.prefill,
  }));
  const [err, setErr] = useState('');
  const cf = useCustomDraft('contact', contact?.custom);
  const [owned, setOwned] = useState<{ id: string; owner: string; sent: boolean } | null>(null);
  const close = () => ui.set({ modal: null, target: null });
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));
  const label = (k: string) => (mode === 'edit' ? t(`edit.${EDIT_LABEL[k]}` as never) : t(`form.${CREATE_LABEL[k] ?? k}` as never));

  const input = ([k, kind, req, opts]: Spec) => {
    const lab = req ? t('form.required', { label: label(k) }) : label(k);
    const cls = cx(styles.input, mode === 'create' && styles.inputSm, kind === 'area' && styles.area);
    return (
      <div key={k} className={cx(styles.field, (kind === 'area' || (mode === 'edit' && k === 'full_name')) && styles.wide)}>
        <label className={styles.label} htmlFor={`cf-${k}`}>
          {lab}
        </label>
        {kind === 'pick' || kind === 'member' ? (
          <select id={`cf-${k}`} className={cls} value={d[k] ?? ''} onChange={(e) => set(k, e.target.value)}>
            <option value="">{t('form.pick')}</option>
            {kind === 'member'
              ? members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
              : opts!.map((o) => <option key={o} value={o}>{t(`${OPT_NS[k]}.${o}` as never)}</option>)}
          </select>
        ) : kind === 'area' ? (
          <textarea id={`cf-${k}`} className={cls} value={d[k] ?? ''} onChange={(e) => set(k, e.target.value)} />
        ) : (
          <input
            id={`cf-${k}`}
            className={cls}
            type={kind}
            value={d[k] ?? ''}
            disabled={k === 'code'}
            placeholder={k === 'code' ? t('form.codeAuto') : undefined}
            onChange={(e) => set(k, e.target.value)}
          />
        )}
      </div>
    );
  };

  const save = async () => {
    if (mode === 'edit' && contact) {
      const c = cf.collect('update');
      if (!c.ok) return;
      const patch = { ...Object.fromEntries(EDIT.map(([k]) => [k, d[k] ?? '']).filter(([k, v]) => k !== 'owner_user_id' || v)), ...(c.custom ? { custom: c.custom } : {}) };
      if (await update.run({ contact_id: contact.id, patch }, { onError: (e) => cf.absorb(e.error.fields) })) close();
      return;
    }
    const missing = CREATE.flatMap(([, fs]) => fs.filter(([k, , req]) => req && !d[k]?.trim()).map(([k]) => label(k)));
    if (missing.length) return setErr(t('form.missing', { fields: missing.join(', ') }));
    const c = cf.collect('create');
    if (!c.ok) return;
    const { full_name, phone, email, zalo, city, district, type, group, source, status, owner_user_id, note } = d;
    const input = { ...Object.fromEntries(Object.entries({ full_name, phone, email, zalo, city, district, type, group, source, status, owner_user_id, note }).filter(([, v]) => v)), ...(c.custom ? { custom: c.custom } : {}) };
    const res = await create.run(input, {
      onError: (e) => {
        if (e.error.code !== 'CONTACT_OWNED') return cf.absorb(e.error.fields);
        setOwned({ id: e.error.fields?.contact_id ?? '', owner: e.error.fields?.owner_name ?? '', sent: false });
        return true;
      },
    });
    if (res) close();
  };

  return (
    <ModalShell
      open
      onClose={close}
      width={mode === 'edit' ? 560 : 720}
      title={mode === 'edit' ? t('edit.title') : t('form.title')}
      icon={mode === 'edit' ? 'ic-cog' : 'ic-plus'}
      iconColor={mode === 'edit' ? color.okStrong : color.brandDeep}
      iconBg={mode === 'edit' ? color.editIconBg : color.brandBg}
      roomy={mode === 'edit'}
      closeLabel={t('edit.close')}
      testId={mode === 'edit' ? 'crm-edit' : 'crm-create-modal'}
      footer={
        <>
          <button type="button" className={styles.btn} onClick={close}>
            {t('edit.cancel')}
          </button>
          <button type="button" className={cx(styles.btn, styles.primary, mode === 'edit' && styles.btnWide)} onClick={() => void save()} data-testid="crm-save">
            {mode === 'edit' ? <Icon name="ic-check" size={15} color={color.white} strokeWidth={2} /> : null}
            {mode === 'edit' ? t('edit.save') : t('form.save')}
          </button>
        </>
      }
    >
      {owned ? (
        <div className={styles.owned} data-testid="contact-owned">
          <div className={styles.ownedTitle}>{t('owned.title')}</div>
          <div className={styles.ownedBody}>
            {t.rich('owned.body', { owner: owned.owner, b: (c) => <b>{c}</b> })}
          </div>
          {owned.sent ? (
            <div className={styles.muted}>{t('owned.sent', { owner: owned.owner })}</div>
          ) : (
            <div className={styles.row}>
              <button type="button" className={cx(styles.btn, styles.primary)} onClick={async () => (await request.run({ contact_id: owned.id })) && setOwned({ ...owned, sent: true })} data-testid="request-access">
                {t('owned.request')}
              </button>
              <button type="button" className={styles.btn} onClick={close}>
                {t('owned.close')}
              </button>
            </div>
          )}
        </div>
      ) : null}
      {err ? <div className={styles.err}>{err}</div> : null}
      {mode === 'edit' ? (
        <div className={styles.grid}>{EDIT.map(input)}</div>
      ) : (
        CREATE.map(([sec, fs]) => (
          <div key={sec} className={styles.section}>
            <div className={styles.sectionTitle}>{t(`form.${sec}` as never)}</div>
            <div className={styles.grid}>{fs.map(input)}</div>
          </div>
        ))
      )}
      <CustomFieldInputs draft={cf} />
    </ModalShell>
  );
}
