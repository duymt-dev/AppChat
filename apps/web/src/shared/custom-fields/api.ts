// Định nghĩa trường tuỳ biến theo thực thể (D56, standards/domain/custom-fields.md) — cùng nguồn với Cài đặt › Trường dữ liệu.
'use client';
import { useMemo } from 'react';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { fieldsForRole, type CustomFieldDef, type CustomFieldEntity, type CustomFieldPlace } from '@appchat/shared';
import { transport } from '../api/client';
import { useAuthz } from '../authz/useCan';

/** Cùng query key với `fieldsQuery` của Cài đặt → `custom_field.*` (invalidates `crm`) làm mới cả hai nơi. */
export const customFieldDefsQuery = (entity: CustomFieldEntity) =>
  queryOptions({
    queryKey: ['crm', 'settings-fields', entity],
    queryFn: () => transport.get<{ data: CustomFieldDef[]; counts: Record<string, number> }>('/settings/fields', { entity }),
  });

/**
 * Đo parity (`?parity=1` lúc tải trang): prototype không dựng trường tuỳ biến, trừ form Sản phẩm L4487 → bỏ ở mọi chỗ khác
 * (prototype-parity §6, D56). Đọc một lần khi nạp module vì điều hướng trong app làm mất query.
 */
const PARITY = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('parity');
const inPrototype = (entity: CustomFieldEntity, place: CustomFieldPlace) => entity === 'product' && place === 'form';

/** Trường tuỳ biến người dùng hiện tại thấy ở `place` (bỏ trường hệ thống, áp `roles`). */
export function useCustomFields(entity: CustomFieldEntity, place: CustomFieldPlace): CustomFieldDef[] {
  const defs = useQuery(customFieldDefsQuery(entity)).data?.data;
  const role = useAuthz().data?.role;
  return useMemo(() => {
    if (!defs || !role || (PARITY && !inPrototype(entity, place))) return [];
    return fieldsForRole(defs, role).filter((f) => f.visible_in[place]);
  }, [defs, role, entity, place]);
}

/** Bộ lọc `{ key: value }` → query param `cf.<key>` (mock / API lọc bằng `matchCustomFilter`). */
export const customParams = (custom: Record<string, string> | undefined) =>
  Object.fromEntries(Object.entries(custom ?? {}).filter(([, v]) => v).map(([k, v]) => [`cf.${k}`, v]));
