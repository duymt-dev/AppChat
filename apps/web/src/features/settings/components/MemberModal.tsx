// Hộp Mời / Sửa thành viên — prototype L7643–7660: Họ tên, Email, Vai trò (4 vai trò gán được — Chủ sở hữu chỉ 1, không gán ở đây).
// Mời → member.invite (gửi email mời); sửa → member.set_role (hoàn tác 24h). Phòng ban của prototype thuộc Phòng ban (OUT) nên bỏ.
'use client';
import { App } from 'antd';
import { useTranslations } from 'next-intl';
import { useAction } from '@/shared/actions/useAction';
import { useSectionStyles } from '../styles/section.styles';
import { useSettingsUi, type MemberDraft } from '../settings-store';
import { FormModal } from './FormModal';

const ROLES: MemberDraft['role'][] = ['manager', 'sales', 'cs', 'accountant'];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberModal() {
  const t = useTranslations('settings.members.modal');
  const tr = useTranslations('settings.roleName');
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const d = useSettingsUi((x) => x.memberModal);
  const set = useSettingsUi((x) => x.set);
  const invite = useAction('member.invite');
  const setRole = useAction('member.set_role');
  if (!d) return null;
  const edit = !!d.id;
  const patch = (p: Partial<MemberDraft>) => set({ memberModal: { ...d, ...p } });
  const save = async () => {
    if (!edit && !EMAIL.test(d.email.trim())) return void message.error(t('errEmail'));
    const r = edit
      ? await setRole.run({ user_id: d.id!, role: d.role })
      : await invite.run({ email: d.email.trim(), role: d.role, ...(d.name.trim() ? { name: d.name.trim() } : {}) });
    if (r) set({ memberModal: null });
  };
  return (
    <FormModal
      open
      title={edit ? t('editTitle') : t('title')}
      onClose={() => set({ memberModal: null })}
      onSave={() => void save()}
      saveLabel={edit ? t('save') : t('send')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={invite.isPending || setRole.isPending}
      testId="st-member-modal"
    >
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={s.input} value={d.name} disabled={edit} onChange={(e) => patch({ name: e.target.value })} placeholder={t('namePh')} data-testid="st-mm-name" />
      </div>
      <div>
        <div className={s.label}>{t('email')}</div>
        <input
          className={s.input}
          value={d.email}
          disabled={edit}
          type="email"
          onChange={(e) => patch({ email: e.target.value })}
          placeholder={t('emailPh')}
          data-testid="st-mm-email"
        />
      </div>
      <div>
        <div className={s.label}>{t('role')}</div>
        <select className={s.select} value={d.role} onChange={(e) => patch({ role: e.target.value as MemberDraft['role'] })} data-testid="st-mm-role">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {tr(r)}
            </option>
          ))}
        </select>
        <div className={s.muted}>{t(`roleD.${d.role}`)}</div>
      </div>
    </FormModal>
  );
}
