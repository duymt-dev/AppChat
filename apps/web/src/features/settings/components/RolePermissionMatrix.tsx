// Ma trận quyền + phạm vi dữ liệu trong trình sửa vai trò (TIP-042). Hàng = nhóm quyền PERM_GROUPS; quyền riêng Chủ sở hữu (DC-298) khoá,
// không bật được. Phạm vi: 6 module × own / team / all / none (đủ sáu — server từ chối thiếu module).
'use client';
import { useTranslations } from 'next-intl';
import { ROLE_SCOPES, SCOPE_MODULES, grantablePermission, type DataScope, type PermissionKey, type ScopeModule } from '@appchat/shared';
import { useSectionStyles } from '../styles/section.styles';
import { useRoleEditorStyles } from '../styles/role-editor.styles';
import { PERM_GROUPS } from '../perm-groups';

interface Props {
  permissions: PermissionKey[];
  scope: Record<ScopeModule, DataScope>;
  onToggle: (p: PermissionKey) => void;
  onScope: (m: ScopeModule, v: DataScope) => void;
}

export function RolePermissionMatrix({ permissions, scope, onToggle, onScope }: Props) {
  const t = useTranslations('settings.roles');
  const te = useTranslations('settings.roleEditor');
  const s = useSectionStyles().styles;
  const { styles, cx } = useRoleEditorStyles();
  return (
    <>
      <div className={s.label}>{te('scopeT')}</div>
      <div className={styles.scopes} data-testid="st-re-scopes">
        {SCOPE_MODULES.map((m) => (
          <label key={m} className={styles.scopeRow}>
            <span>{te(`module.${m}`)}</span>
            <select className={s.select} value={scope[m]} onChange={(e) => onScope(m, e.target.value as DataScope)} data-testid={`st-re-scope-${m}`}>
              {ROLE_SCOPES.map((v) => (
                <option key={v} value={v}>
                  {te(`scope.${v}`)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className={s.label}>{te('permsT')}</div>
      {PERM_GROUPS.map((g) => (
        <div key={g.key}>
          <div className={styles.group}>{t(`group.${g.key}`)}</div>
          <div className={styles.perms}>
            {g.perms.map((p) => {
              const ok = grantablePermission(p);
              return (
                <label key={p} className={cx(styles.perm, !ok && styles.locked)} title={ok ? undefined : te('ownerOnly')}>
                  <input type="checkbox" checked={ok && permissions.includes(p)} disabled={!ok} onChange={() => onToggle(p)} data-perm={p} />
                  {t(`perms.${p.replace('.', '_')}`)}
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
}
