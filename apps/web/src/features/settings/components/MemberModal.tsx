// Hộp Mời / Sửa thành viên — prototype L7643–7660: Họ tên, Email, Vai trò. Lựa chọn vai trò lấy từ /settings/roles (TIP-042): hệ thống trừ
// Chủ sở hữu + tuỳ biến còn sống, lọc theo quyền người gán (không phải Chủ sở hữu: tập quyền ⊆ của mình — DC-298; server kiểm lại).
// Mời → member.invite (gửi email mời); sửa → member.set_role (hoàn tác 24h). Phòng ban của prototype thuộc Phòng ban (OUT) nên bỏ.
'use client';
import { App } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { escalationOf, isSystemRole } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useAuthz } from '@/shared/authz/useCan';
import { rolesQuery } from '../api';
import { useRoleLabel } from '../hooks/useRoleLabel';
import { useSectionStyles } from '../styles/section.styles';
import { useSettingsUi, type MemberDraft } from '../settings-store';
import { FormModal } from './FormModal';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function MemberModal() {
  const t = useTranslations('settings.members.modal');
  const label = useRoleLabel();
  const roles = useQuery(rolesQuery()).data?.roles ?? [];
  const me = useAuthz().data;
  const { message } = App.useApp();
  const s = useSectionStyles().styles;
  const d = useSettingsUi((x) => x.memberModal);
  const set = useSettingsUi((x) => x.set);
  const invite = useAction('member.invite');
  const setRole = useAction('member.set_role');
  if (!d) return null;
  const mine = new Set<string>(me?.permissions ?? []);
  const choices = roles.filter((r) => r.key !== 'owner' && (me?.is_owner || !escalationOf(r.permissions, mine).length));
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
        <select className={s.select} value={d.role} onChange={(e) => patch({ role: e.target.value })} data-testid="st-mm-role">
          {choices.map((r) => (
            <option key={r.key} value={r.key}>
              {label(r.key)}
            </option>
          ))}
        </select>
        <div className={s.muted}>{isSystemRole(d.role) ? t(`roleD.${d.role}`) : t('roleD.custom')}</div>
      </div>
    </FormModal>
  );
}
