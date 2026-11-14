// Trình sửa vai trò tuỳ biến (TIP-042): mở nháp (trắng / nhân bản / sửa), bật tắt quyền + phạm vi, lưu bằng role.create / role.update
// (CAS if_version — người khác vừa sửa → STALE_VERSION: báo + tải lại danh sách, không ghi đè âm thầm). Quyền riêng Chủ sở hữu (DC-298)
// không bật được; nhân bản ghi lại quyền bị bỏ để hiện nhãn. Đóng chỉ khi action thành công (preview bị huỷ → giữ nháp).
'use client';
import { App } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { SCOPE_MODULES, cloneSystemRole, grantablePermission, type DataScope, type PermissionKey, type ScopeModule } from '@appchat/shared';
import { useAction } from '@/shared/actions/useAction';
import { useSettingsUi } from '../settings-store';
import type { RoleDraft, RoleRow } from '../roles.types';

const EMPTY_SCOPE = Object.fromEntries(SCOPE_MODULES.map((m) => [m, 'none'])) as Record<ScopeModule, DataScope>;

/** Nháp tạo trắng. */
export const blankDraft = (): RoleDraft => ({ name: '', permissions: [], scope: { ...EMPTY_SCOPE }, dropped: [] });

/** Nháp nhân bản từ một vai trò (hệ thống: theo cloneSystemRole — bỏ quyền riêng Chủ sở hữu; tuỳ biến: chép nguyên). */
export function cloneDraft(r: RoleRow, name: string): RoleDraft {
  const sys = cloneSystemRole(r.key);
  const basedOn = { key: r.key, name: r.name };
  if (sys) return { name, cloneFrom: r.key, basedOn, permissions: sys.permissions, scope: sys.scope, dropped: sys.dropped };
  return { name, cloneFrom: r.key, basedOn, permissions: [...r.permissions], scope: { ...r.scope } as Record<ScopeModule, DataScope>, dropped: [] };
}

export const editDraft = (r: RoleRow): RoleDraft => ({
  key: r.key,
  version: r.version,
  name: r.name,
  permissions: [...r.permissions],
  scope: { ...r.scope } as Record<ScopeModule, DataScope>,
  dropped: [],
});

export function useRoleEditor() {
  const t = useTranslations('settings.roleEditor');
  const { message } = App.useApp();
  const qc = useQueryClient();
  const d = useSettingsUi((x) => x.roleEditor);
  const set = useSettingsUi((x) => x.set);
  const create = useAction('role.create');
  const update = useAction('role.update');
  const remove = useAction('role.delete');

  const patch = (p: Partial<RoleDraft>) => d && set({ roleEditor: { ...d, ...p } });
  const toggle = (p: PermissionKey) => {
    if (!d || !grantablePermission(p)) return;
    const on = d.permissions.includes(p);
    patch({ permissions: on ? d.permissions.filter((x) => x !== p) : [...d.permissions, p], cloneFrom: undefined });
  };
  const setScope = (m: ScopeModule, v: DataScope) => d && patch({ scope: { ...d.scope, [m]: v }, cloneFrom: undefined });
  const close = () => set({ roleEditor: null });

  const onError = (e: { error: { code: string; fields?: Record<string, string> } }) => {
    if (e.error.code === 'HAS_DEPENDENCIES') {
      void message.error(t('inUse', { members: e.error.fields?.members ?? '0', invites: e.error.fields?.invites ?? '0' }));
      return true;
    }
    if (e.error.code !== 'STALE_VERSION') return false;
    void message.error(t('stale'));
    void qc.invalidateQueries({ queryKey: ['roles'] });
    void qc.invalidateQueries({ queryKey: ['members', 'roles'] });
    return true;
  };

  const save = async () => {
    if (!d) return;
    if (!d.name.trim()) return void message.error(t('errName'));
    // Nhân bản chưa chỉnh gì → gửi clone_from_key (server tự bỏ quyền riêng Chủ sở hữu); đã chỉnh → gửi tập quyền + phạm vi tường minh.
    const r = d.key
      ? await update.run({ role_key: d.key, if_version: d.version, name: d.name.trim(), permissions: d.permissions, data_scope: d.scope }, { onError })
      : await create.run(
          d.cloneFrom ? { name: d.name.trim(), clone_from_key: d.cloneFrom } : { name: d.name.trim(), permissions: d.permissions, data_scope: d.scope },
          { onError },
        );
    if (r) close();
  };

  const del = async () => {
    if (!d?.key || !window.confirm(t('confirmDelete', { name: d.name }))) return;
    const r = await remove.run({ role_key: d.key, if_version: d.version }, { onError });
    if (r) close();
  };

  return { d, patch, toggle, setScope, save, del, close, pending: create.isPending || update.isPending || remove.isPending };
}
