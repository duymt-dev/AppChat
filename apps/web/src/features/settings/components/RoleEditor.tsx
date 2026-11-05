// Hộp tạo / nhân bản / sửa vai trò tuỳ biến (TIP-042; prototype chưa vẽ — PD-018). Tên + nhãn nhân bản (quyền bị bỏ theo DC-298) +
// ma trận quyền / phạm vi; sửa có nút Xoá (role.delete — còn người dùng → báo số lượng, không tự chuyển vai trò). Ghi qua useRoleEditor.
'use client';
import { useTranslations } from 'next-intl';
import { useSectionStyles } from '../styles/section.styles';
import { useRoleEditorStyles } from '../styles/role-editor.styles';
import { useRoleEditor } from '../hooks/useRoleEditor';
import { FormModal } from './FormModal';
import { RolePermissionMatrix } from './RolePermissionMatrix';

export function RoleEditor() {
  const t = useTranslations('settings.roleEditor');
  const tr = useTranslations('settings.roleName');
  const tp = useTranslations('settings.roles.perms');
  const s = useSectionStyles().styles;
  const { styles } = useRoleEditorStyles();
  const e = useRoleEditor();
  const d = e.d;
  if (!d) return null;
  const edit = !!d.key;
  return (
    <FormModal
      open
      wide
      title={edit ? t('editTitle') : t('title')}
      onClose={e.close}
      onSave={() => void e.save()}
      saveLabel={edit ? t('save') : t('create')}
      cancelLabel={t('cancel')}
      closeLabel={t('close')}
      pending={e.pending}
      testId="st-role-editor"
    >
      <div>
        <div className={s.label}>{t('name')}</div>
        <input className={s.input} value={d.name} maxLength={120} onChange={(x) => e.patch({ name: x.target.value })} placeholder={t('namePh')} data-testid="st-re-name" />
      </div>
      {d.basedOn ? (
        <div className={styles.note} data-testid="st-re-clone">
          {t('cloneOf', { name: d.basedOn.key.startsWith('custom:') ? d.basedOn.name : tr(d.basedOn.key) })}
        </div>
      ) : null}
      {d.dropped.length ? (
        <div className={styles.warn} data-testid="st-re-dropped">
          {t('dropped', { list: d.dropped.map((p) => tp(p.replace('.', '_'))).join(', ') })}
        </div>
      ) : null}
      <RolePermissionMatrix permissions={d.permissions} scope={d.scope} onToggle={e.toggle} onScope={e.setScope} />
      {edit ? (
        <div className={styles.foot}>
          <button type="button" className={s.dangerGhost} onClick={() => void e.del()} disabled={e.pending} data-testid="st-re-delete">
            {t('delete')}
          </button>
        </div>
      ) : null}
    </FormModal>
  );
}
