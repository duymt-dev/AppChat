// Modal "Cập nhật khách hàng" (prototype L2600–2625, 560px) và "Tạo khách hàng" (L5189–5228, 720px, 3 nhóm trường).
// Tạo trùng với khách đã có người phụ trách → CONTACT_OWNED: hiện "Đã có người phụ trách" + "Xin chia sẻ" (D32), không lộ dữ liệu khách.
// Sửa (TIP-026): ô "Phụ trách" giữ như prototype nhưng không lưu qua contact.update (DC-066) — chọn người khác mở "Chuyển phụ trách"
// điền sẵn người nhận (crm.reassign; không có quyền → ô khoá). Trùng khách của mình → nút mở khách đã có. "—" không điền vào chức danh.
// TIP-025b §D.3: sửa nhận `version` (edit-context) → gửi `if_version`, chỉ gửi trường ĐÃ ĐỔI và được thấy (ô ẩn / bị che không bao giờ
// thành chuỗi rỗng); lệch phiên bản → báo, giữ nội dung đang sửa. `onClose` / `onTransfer` cho host toàn cục (ngoài màn Khách hàng).
'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ModalShell, Icon, color } from '@appchat/ui';
import { useAction } from '@/shared/actions/useAction';
import { useCan } from '@/shared/authz/useCan';
import { CustomFieldInputs, useCustomDraft } from '@/shared/custom-fields';
import { useFormStyles } from '../styles/form.styles';
import { useCrmUi } from '../crm-store';
import { membersQuery } from '../api';
import type { ContactRow } from '../types';

/** Ngữ cảnh sửa tối thiểu: dòng danh sách hoặc edit-context (TIP-025b). `hidden` = trường không được thấy — không hiện, không gửi. */
export type EditTarget = Pick<ContactRow, 'id'> & Partial<Omit<ContactRow, 'id'>> & { version?: number; hidden?: string[] };

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

export function ContactFormModal({ mode, contact, onClose, onTransfer }: { mode: 'create' | 'edit'; contact?: EditTarget; onClose?: () => void; onTransfer?: (to: string) => void }) {
  const t = useTranslations('customers');
  const { styles, cx } = useFormStyles();
  const ui = useCrmUi();
  const members = useQuery(membersQuery()).data ?? [];
  const create = useAction<{ contact_id: string }>('contact.create');
  const update = useAction('contact.update');
  const request = useAction('contact.request_access');
  const canReassign = useCan('crm.reassign');
  const [dup, setDup] = useState('');
  const [base] = useState<Draft>((): Draft => {
    if (!contact) return {};
    const v = { full_name: contact.full_name, title: contact.title === '—' ? '' : contact.title, owner_user_id: contact.owner_user_id, email: contact.email, phone: contact.phone, zalo: contact.zalo, city: contact.city, district: contact.district };
    return Object.fromEntries(Object.entries(v).filter(([, x]) => x != null)) as Draft;
  });
  const [d, setD] = useState<Draft>((): Draft => ({ ...base, ...ui.prefill }));
  const [stale, setStale] = useState(false);
  const shown = (k: string) => !contact?.hidden?.includes(k);
  const [err, setErr] = useState('');
  const cf = useCustomDraft('contact', contact?.custom);
  const [owned, setOwned] = useState<{ id: string; owner: string; sent: boolean } | null>(null);
  const close = onClose ?? (() => ui.set({ modal: null, target: null }));
  const set = (k: string, v: string) => setD((x) => ({ ...x, [k]: v }));
  const editOwner = (k: string) => mode === 'edit' && k === 'owner_user_id';
  const lockOwner = (k: string) => editOwner(k) && !canReassign;
  const transferTo = (to: string) => {
    if (!contact || !to || to === contact.owner_user_id) return;
    if (onTransfer) return onTransfer(to);
    ui.set({ modal: 'transfer', target: contact.id, prefill: { to_user_id: to } });
  };
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
          <select id={`cf-${k}`} className={cls} value={d[k] ?? ''} disabled={lockOwner(k)} onChange={(e) => (editOwner(k) ? transferTo(e.target.value) : set(k, e.target.value))}>
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
      // Chỉ trường được thấy VÀ đã đổi so với bản đọc — không gửi lại toàn bộ (ô ẩn / chưa tải không thành rỗng).
      const changed = EDIT.filter(([k]) => k !== 'owner_user_id' && shown(k) && (d[k] ?? '') !== (base[k] ?? '')).map(([k]) => [k, d[k] ?? '']);
      const patch = { ...Object.fromEntries(changed), ...(c.custom ? { custom: c.custom } : {}) };
      if (!Object.keys(patch).length) return close();
      setStale(false);
      const onError = (e: { error: { code: string; fields?: Record<string, string> } }) => (e.error.code === 'STALE_VERSION' ? (setStale(true), true) : cf.absorb(e.error.fields));
      if (await update.run({ contact_id: contact.id, patch, ...(contact.version ? { if_version: contact.version } : {}) }, { onError })) close();
      return;
    }
    const missing = CREATE.flatMap(([, fs]) => fs.filter(([k, , req]) => req && !d[k]?.trim()).map(([k]) => label(k)));
    if (missing.length) return setErr(t('form.missing', { fields: missing.join(', ') }));
    const c = cf.collect('create');
    if (!c.ok) return;
    const { full_name, phone, email, zalo, address, city, district, birthday, gender, type, group, source, status, owner_user_id, note } = d;
    const fields = { full_name, phone, email, zalo, address, city, district, birthday, gender, type, group, source, status, owner_user_id, note };
    const input = { ...Object.fromEntries(Object.entries(fields).filter(([, v]) => v)), ...(c.custom ? { custom: c.custom } : {}) };
    setDup('');
    const res = await create.run(input, {
      onError: (e) => {
        if (e.error.code === 'CONFLICT' && e.error.fields?.contact_id) {
          setDup(e.error.fields.contact_id);
          return true;
        }
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
      {stale ? <div className={styles.err} data-testid="crm-edit-stale">{t('edit.stale')}</div> : null}
      {dup ? (
        <div className={styles.owned} data-testid="contact-dup">
          <div className={styles.ownedBody}>{t('owned.mine')}</div>
          <button type="button" className={cx(styles.btn, styles.primary)} onClick={() => ui.set({ modal: null, target: null, detail: dup })} data-testid="open-dup">
            {t('owned.open')}
          </button>
        </div>
      ) : null}

      {mode === 'edit' ? (
        <div className={styles.grid}>{EDIT.filter(([k]) => shown(k)).map(input)}</div>
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
