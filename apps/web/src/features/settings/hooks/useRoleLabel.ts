// Nhãn vai trò (TIP-042): vai trò hệ thống theo i18n `settings.roleName`, vai trò tuỳ biến hiển thị `name` từ DB (không gọi tr(custom:…)).
// Khoá không còn trong danh sách (vai trò vừa xoá) → nhãn "Vai trò đã xoá" thay vì lộ khoá.
'use client';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { isSystemRole } from '@appchat/shared';
import { rolesQuery } from '../api';

export function useRoleLabel() {
  const tr = useTranslations('settings.roleName');
  const t = useTranslations('settings.roleEditor');
  const { data } = useQuery(rolesQuery());
  return (key: string): string => {
    if (isSystemRole(key)) return tr(key);
    return data?.roles.find((r) => r.key === key)?.name ?? t('deleted');
  };
}
